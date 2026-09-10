import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { sendOtpEmail, sendAccountExistsEmail } from "../lib/mailer";
import { setAuthCookie, clearAuthCookie } from "../lib/authCookie";
import { prisma } from "../lib/db";
import { hashCode, codesMatch, MAX_CODE_ATTEMPTS, RESEND_COOLDOWN_MS } from "../lib/otp";
import { checkRateLimit, clientIp } from "../lib/rateLimit";
import { LEGAL_VERSION } from "../lib/legal";
import { hashPassword, verifyPassword, isModernPasswordHash } from "../lib/password";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export function sign(user: { id: string; username: string; sessionVersion: number }) {
  return jwt.sign({ id: user.id, username: user.username, sv: user.sessionVersion }, JWT_SECRET, { expiresIn: "7d", algorithm: "HS256" });
}

function publicUser(user: { id: string; username: string; email: string; avatarUrl: string | null; hasDonated: boolean; role: string }) {
  return { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl, hasDonated: user.hasDonated, isOwner: user.role === "OWNER" };
}

router.post("/register", async (req: Request, res: Response): Promise<any> => {
  const ip = clientIp(req);
  const ipLimit = await checkRateLimit(`register:ip:${ip}`, 5, 15 * 60 * 1000);
  if (!ipLimit.ok) return res.status(429).json({ error: "Too many registration attempts. Please try again later." });
  const { username, email, password, legalVersion } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: "All fields required" });
  if (username.trim().length < 3 || username.trim().length > 32) return res.status(400).json({ error: "Username must be between 3 and 32 characters." });
  if (password.length < 8 || password.length > 20) return res.status(400).json({ error: "Password must be between 8 and 20 characters." });
  if (legalVersion !== LEGAL_VERSION) return res.status(400).json({ error: "Please accept the current legal policies before creating an account." });
  const normalEmail = String(email).trim().toLowerCase();
  if (normalEmail.length > 254 || !/^([^\s@]+)@([^\s@]+)\.([^\s@]+)$/.test(normalEmail)) return res.status(400).json({ error: "Enter a valid email address." });
  const existingUsername = await prisma.user.findUnique({ where: { username: username.trim() } });
  if (existingUsername) return res.status(400).json({ error: "That username is already taken." });
  const existingEmail = await prisma.user.findUnique({ where: { email: normalEmail } });
  if (existingEmail) {
    try { await sendAccountExistsEmail(normalEmail); } catch (err) { console.error("Failed to send account-exists notice:", err); }
    return res.json({ success: true, email: normalEmail });
  }
  const passwordHash = await hashPassword(password);
  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.otpToken.upsert({ where: { email: normalEmail }, update: { token: hashCode(otp), expiresAt, username: username.trim(), passwordHash, attempts: 0, lastSentAt: new Date() }, create: { email: normalEmail, token: hashCode(otp), expiresAt, username: username.trim(), passwordHash } });
  try { await sendOtpEmail(normalEmail, otp); } catch (err) { console.error("Failed to send OTP email:", err); return res.status(500).json({ error: "Couldn't send verification email. Check SMTP settings." }); }
  res.json({ success: true, email: normalEmail });
});

router.post("/verify-otp", async (req: Request, res: Response): Promise<any> => {
  const ip = clientIp(req);
  const ipLimit = await checkRateLimit(`verify-otp:ip:${ip}`, 10, 15 * 60 * 1000);
  if (!ipLimit.ok) return res.status(429).json({ error: "Too many attempts. Please try again later." });
  const { email, token } = req.body;
  const normalEmail = String(email || "").trim().toLowerCase();
  const row = await prisma.otpToken.findUnique({ where: { email: normalEmail } });
  if (!row) return res.status(400).json({ error: "No pending registration for this email." });
  if (row.expiresAt < new Date()) { await prisma.otpToken.delete({ where: { email: normalEmail } }); return res.status(400).json({ error: "Code expired. Request a new one." }); }
  if (row.attempts >= MAX_CODE_ATTEMPTS) { await prisma.otpToken.delete({ where: { email: normalEmail } }); return res.status(429).json({ error: "Too many incorrect attempts. Request a new code." }); }
  if (!codesMatch(String(token), row.token)) { await prisma.otpToken.update({ where: { email: normalEmail }, data: { attempts: { increment: 1 } } }); return res.status(400).json({ error: "Invalid code." }); }
  const user = await prisma.user.create({ data: { email: row.email, username: row.username, passwordHash: row.passwordHash, termsAcceptedVersion: LEGAL_VERSION, privacyAcceptedVersion: LEGAL_VERSION, refundAcceptedVersion: LEGAL_VERSION, legalAcceptedAt: new Date() } });
  await prisma.otpToken.delete({ where: { email: normalEmail } });
  setAuthCookie(res, sign(user));
  res.json({ user: publicUser(user) });
});

router.post("/resend-otp", async (req: Request, res: Response): Promise<any> => {
  const ip = clientIp(req); const ipLimit = await checkRateLimit(`resend-otp:ip:${ip}`, 5, 15 * 60 * 1000);
  if (!ipLimit.ok) return res.status(429).json({ error: "Too many attempts. Please try again later." });
  const { email } = req.body; const normalEmail = String(email || "").trim().toLowerCase();
  const row = await prisma.otpToken.findUnique({ where: { email: normalEmail } });
  if (!row) return res.status(400).json({ error: "No pending registration found." });
  if (Date.now() - row.lastSentAt.getTime() < RESEND_COOLDOWN_MS) return res.status(429).json({ error: "Please wait before requesting another code." });
  const otp = crypto.randomInt(100000, 999999).toString(); const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.otpToken.update({ where: { email: normalEmail }, data: { token: hashCode(otp), expiresAt, attempts: 0, lastSentAt: new Date() } });
  try { await sendOtpEmail(normalEmail, otp); } catch (err) { console.error("Failed to resend OTP email:", err); return res.status(500).json({ error: "Couldn't resend verification email." }); }
  res.json({ success: true });
});

router.post("/login", async (req: Request, res: Response): Promise<any> => {
  const { identifier, email, password, legalVersion } = req.body;
  const id = String(identifier ?? email ?? "").trim();
  if (!id || !password) return res.status(400).json({ error: "All fields required." });
  if (id.length > 320 || String(password).length < 8 || String(password).length > 20) return res.status(400).json({ error: "Invalid credentials." });
  if (legalVersion !== LEGAL_VERSION) return res.status(400).json({ error: "Please accept the current legal policies before signing in." });
  const ip = clientIp(req); const ipLimit = await checkRateLimit(`login:ip:${ip}`, 20, 5 * 60 * 1000); if (!ipLimit.ok) return res.status(429).json({ error: "Too many login attempts. Please try again later." });
  const acctLimit = await checkRateLimit(`login:acct:${id.toLowerCase()}`, 8, 15 * 60 * 1000); if (!acctLimit.ok) return res.status(429).json({ error: "Too many login attempts. Please try again later." });
  const user = id.includes("@") ? await prisma.user.findUnique({ where: { email: id.toLowerCase() } }) : await prisma.user.findUnique({ where: { username: id } });
  if (!user || !user.passwordHash) { await verifyPassword(password, "scrypt$1$ABEiM0RVZneImaq7zN3u_w$Sw1zf8ecsJezjleD4TAhJaij2tkmbs_Ev1tMgD7LYok"); return res.status(400).json({ error: "Invalid username/email or password." }); }
  let valid = await verifyPassword(password, user.passwordHash); if (!valid && user.passwordHash.startsWith("$2")) valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(400).json({ error: "Invalid username/email or password." });
  if (!isModernPasswordHash(user.passwordHash)) { try { await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } }); } catch (err) { console.error("Failed to upgrade legacy password hash:", err); } }
  await prisma.user.update({ where: { id: user.id }, data: { termsAcceptedVersion: LEGAL_VERSION, privacyAcceptedVersion: LEGAL_VERSION, refundAcceptedVersion: LEGAL_VERSION, legalAcceptedAt: new Date() } });
  setAuthCookie(res, sign(user)); res.json({ user: publicUser(user) });
});

router.get("/me", requireAuth, async (req: AuthRequest, res: Response): Promise<any> => { const user = await prisma.user.findUnique({ where: { id: req.userId } }); if (!user) return res.status(404).json({ error: "User not found" }); res.json(publicUser(user)); });

router.post("/google", async (req: Request, res: Response): Promise<any> => {
  const ipLimit = await checkRateLimit(`google:ip:${clientIp(req)}`, 20, 15 * 60 * 1000); if (!ipLimit.ok) return res.status(429).json({ error: "Too many Google sign-in attempts. Please try again later." });
  if (!GOOGLE_CLIENT_ID) return res.status(500).json({ error: "Google Sign-In not configured on this server yet" });
  const { credential, legalVersion } = req.body; if (!credential) return res.status(400).json({ error: "Missing credential" });
  let payload; try { const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID }); payload = ticket.getPayload(); } catch { return res.status(400).json({ error: "Invalid Google token" }); }
  if (!payload?.email) return res.status(400).json({ error: "Invalid Google token" });
  const googleEmail = payload.email.toLowerCase();
  let user = await prisma.user.findFirst({ where: { OR: [{ googleId: payload.sub }, { email: googleEmail }] } });
  if (!user) { const base = googleEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || "user"; let suggestedUsername = base; let n = 1; while (await prisma.user.findUnique({ where: { username: suggestedUsername } })) suggestedUsername = `${base}${n++}`; return res.json({ needsSetup: true, email: googleEmail, suggestedUsername }); }
  if (!user.googleId) user = await prisma.user.update({ where: { id: user.id }, data: { googleId: payload.sub, avatarUrl: user.avatarUrl ?? payload.picture ?? null } });
  const legalCurrent = user.termsAcceptedVersion === LEGAL_VERSION && user.privacyAcceptedVersion === LEGAL_VERSION && user.refundAcceptedVersion === LEGAL_VERSION;
  if (!legalCurrent) return res.status(409).json({ error: "Please accept the current legal policies before signing in with Google.", legalUpdateRequired: true });
  setAuthCookie(res, sign(user)); res.json({ user: publicUser(user) });
});

router.post("/google/complete", async (req: Request, res: Response): Promise<any> => {
  const ipLimit = await checkRateLimit(`google-complete:ip:${clientIp(req)}`, 10, 15 * 60 * 1000); if (!ipLimit.ok) return res.status(429).json({ error: "Too many attempts. Please try again later." });
  if (!GOOGLE_CLIENT_ID) return res.status(500).json({ error: "Google Sign-In not configured on this server yet" });
  const { credential, username, password, legalVersion } = req.body;
  if (!credential || !username || !password) return res.status(400).json({ error: "All fields required" });
  if (username.trim().length < 3 || username.trim().length > 32) return res.status(400).json({ error: "Username must be between 3 and 32 characters." });
  if (password.length < 8 || password.length > 20) return res.status(400).json({ error: "Password must be between 8 and 20 characters." });
  if (legalVersion !== LEGAL_VERSION) return res.status(400).json({ error: "Please accept the current legal policies before creating an account." });
  let payload; try { const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID }); payload = ticket.getPayload(); } catch { return res.status(400).json({ error: "Invalid Google token" }); }
  if (!payload?.email) return res.status(400).json({ error: "Invalid Google token" });
  const googleEmail = payload.email.toLowerCase();
  const existing = await prisma.user.findFirst({ where: { OR: [{ googleId: payload.sub }, { email: googleEmail }] } }); if (existing) return res.status(400).json({ error: "An account with this Google email already exists." });
  const existingUsername = await prisma.user.findUnique({ where: { username: username.trim() } }); if (existingUsername) return res.status(400).json({ error: "That username is already taken." });
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email: googleEmail, username: username.trim(), passwordHash, googleId: payload.sub, avatarUrl: payload.picture ?? null, termsAcceptedVersion: LEGAL_VERSION, privacyAcceptedVersion: LEGAL_VERSION, refundAcceptedVersion: LEGAL_VERSION, legalAcceptedAt: new Date() } });
  setAuthCookie(res, sign(user)); res.json({ user: publicUser(user) });
});

router.post("/logout", (_req: Request, res: Response) => { clearAuthCookie(res); res.json({ success: true }); });
export default router;
