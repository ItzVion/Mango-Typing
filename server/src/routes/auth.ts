import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { sendOtpEmail } from "../lib/mailer";
import { prisma } from "../lib/db";
import { hashCode, codesMatch, MAX_CODE_ATTEMPTS, RESEND_COOLDOWN_MS } from "../lib/otp";
import { checkRateLimit, clientIp } from "../lib/rateLimit";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Algorithm pinned explicitly on both sign and verify (see middleware/auth.ts
// too) — jsonwebtoken will otherwise accept whatever algorithm the token
// header claims, which is the classic "alg confusion" footgun.
export function sign(user: { id: string; username: string; sessionVersion: number }) {
  return jwt.sign({ id: user.id, username: user.username, sv: user.sessionVersion }, JWT_SECRET, { expiresIn: "7d", algorithm: "HS256" });
}

// A fixed, valid bcrypt hash with no matching password. Used to run a real
// bcrypt.compare on the "no such account" path so that path takes the same
// time as a real wrong-password check — otherwise timing alone reveals
// whether an identifier exists.
const DUMMY_HASH = "$2b$10$zzaZn9j5xAPe7VGHfXCyeebzL/bNxHhZB.tU6kC27f74hQ2wLzM2O";

function publicUser(user: { id: string; username: string; email: string; avatarUrl: string | null; hasDonated: boolean; role: string }) {
  return { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl, hasDonated: user.hasDonated, isOwner: user.role === "OWNER" };
}

// Step 1 of registration: validate + stash the pending account, email a 6-digit
// code, and wait for /verify-otp. Mirrors deathsmp-web's register -> OTP flow.
router.post("/register", async (req: Request, res: Response): Promise<any> => {
  const ip = clientIp(req);
  const ipLimit = await checkRateLimit(`register:ip:${ip}`, 5, 15 * 60 * 1000);
  if (!ipLimit.ok) return res.status(429).json({ error: "Too many registration attempts. Please try again later." });

  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: "All fields required" });
  if (username.trim().length < 3) return res.status(400).json({ error: "Username must be at least 3 characters." });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });

  const normalEmail = String(email).trim().toLowerCase();
  const existingEmail = await prisma.user.findUnique({ where: { email: normalEmail } });
  if (existingEmail) return res.status(400).json({ error: "An account with this email already exists." });
  const existingUsername = await prisma.user.findUnique({ where: { username: username.trim() } });
  if (existingUsername) return res.status(400).json({ error: "That username is already taken." });

  const passwordHash = await bcrypt.hash(password, 10);
  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.otpToken.upsert({
    where: { email: normalEmail },
    update: { token: hashCode(otp), expiresAt, username: username.trim(), passwordHash, attempts: 0, lastSentAt: new Date() },
    create: { email: normalEmail, token: hashCode(otp), expiresAt, username: username.trim(), passwordHash },
  });

  try {
    await sendOtpEmail(normalEmail, otp);
  } catch (err) {
    console.error("Failed to send OTP email:", err);
    return res.status(500).json({ error: "Couldn't send verification email. Check SMTP settings." });
  }

  res.json({ success: true, email: normalEmail });
});

// Step 2 of registration: confirm the code, actually create the account, and log in.
router.post("/verify-otp", async (req: Request, res: Response): Promise<any> => {
  const ip = clientIp(req);
  const ipLimit = await checkRateLimit(`verify-otp:ip:${ip}`, 10, 15 * 60 * 1000);
  if (!ipLimit.ok) return res.status(429).json({ error: "Too many attempts. Please try again later." });

  const { email, token } = req.body;
  const normalEmail = String(email || "").trim().toLowerCase();
  const row = await prisma.otpToken.findUnique({ where: { email: normalEmail } });
  if (!row) return res.status(400).json({ error: "No pending registration for this email." });
  if (row.expiresAt < new Date()) {
    await prisma.otpToken.delete({ where: { email: normalEmail } });
    return res.status(400).json({ error: "Code expired. Request a new one." });
  }
  if (row.attempts >= MAX_CODE_ATTEMPTS) {
    await prisma.otpToken.delete({ where: { email: normalEmail } });
    return res.status(429).json({ error: "Too many incorrect attempts. Request a new code." });
  }
  if (!codesMatch(String(token), row.token)) {
    await prisma.otpToken.update({ where: { email: normalEmail }, data: { attempts: { increment: 1 } } });
    return res.status(400).json({ error: "Invalid code." });
  }

  const user = await prisma.user.create({
    data: { email: row.email, username: row.username, passwordHash: row.passwordHash },
  });
  await prisma.otpToken.delete({ where: { email: normalEmail } });

  res.json({ token: sign(user), user: publicUser(user) });
});

router.post("/resend-otp", async (req: Request, res: Response): Promise<any> => {
  const ip = clientIp(req);
  const ipLimit = await checkRateLimit(`resend-otp:ip:${ip}`, 5, 15 * 60 * 1000);
  if (!ipLimit.ok) return res.status(429).json({ error: "Too many attempts. Please try again later." });

  const { email } = req.body;
  const normalEmail = String(email || "").trim().toLowerCase();
  const row = await prisma.otpToken.findUnique({ where: { email: normalEmail } });
  if (!row) return res.status(400).json({ error: "No pending registration found." });

  // Server-side cooldown — the client's 30s countdown is just UX; this is
  // the actual enforcement, since a direct API call can ignore the client.
  const msSinceLastSend = Date.now() - row.lastSentAt.getTime();
  if (msSinceLastSend < RESEND_COOLDOWN_MS) {
    return res.status(429).json({ error: "Please wait before requesting another code." });
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.otpToken.update({
    where: { email: normalEmail },
    data: { token: hashCode(otp), expiresAt, attempts: 0, lastSentAt: new Date() },
  });

  try {
    await sendOtpEmail(normalEmail, otp);
  } catch (err) {
    console.error("Failed to resend OTP email:", err);
    return res.status(500).json({ error: "Couldn't resend verification email." });
  }
  res.json({ success: true });
});

// Accepts either an email or a username as the identifier, like deathsmp-web.
router.post("/login", async (req: Request, res: Response): Promise<any> => {
  const { identifier, email, password } = req.body;
  const id = String(identifier ?? email ?? "").trim();
  if (!id || !password) return res.status(400).json({ error: "All fields required." });

  // Two limiters: per-IP catches a single attacker spraying many accounts;
  // per-identifier catches many attackers (or a botnet) hammering one account.
  const ip = clientIp(req);
  const ipLimit = await checkRateLimit(`login:ip:${ip}`, 20, 5 * 60 * 1000);
  if (!ipLimit.ok) return res.status(429).json({ error: "Too many login attempts. Please try again later." });
  const acctLimit = await checkRateLimit(`login:acct:${id.toLowerCase()}`, 8, 15 * 60 * 1000);
  if (!acctLimit.ok) return res.status(429).json({ error: "Too many login attempts. Please try again later." });

  const user = id.includes("@")
    ? await prisma.user.findUnique({ where: { email: id.toLowerCase() } })
    : await prisma.user.findUnique({ where: { username: id } });

  // Same error message and a real (dummy) bcrypt compare on every failure
  // path, so neither the response text nor the response time reveals
  // whether the account exists, whether it's Google-only, or the password
  // was simply wrong.
  if (!user || !user.passwordHash) {
    await bcrypt.compare(password, DUMMY_HASH);
    return res.status(400).json({ error: "Invalid username/email or password." });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(400).json({ error: "Invalid username/email or password." });

  res.json({ token: sign(user), user: publicUser(user) });
});

router.get("/me", requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(publicUser(user));
});

// Google Sign-In: client sends the ID token from Google Identity Services,
// we verify it server-side. Existing users log straight in. A brand-new
// Google account does NOT get silently created here — we tell the client to
// collect a username + password first (so the account also works for
// manual email/password login later), then POST /google/complete finishes it.
router.post("/google", async (req: Request, res: Response): Promise<any> => {
  if (!GOOGLE_CLIENT_ID) return res.status(500).json({ error: "Google Sign-In not configured on this server yet" });
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: "Missing credential" });

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    return res.status(400).json({ error: "Invalid Google token" });
  }
  if (!payload?.email) return res.status(400).json({ error: "Invalid Google token" });
  // Registration/login both normalize emails to lowercase (see /login,
  // /register). Google's payload email is normally already lowercase, but
  // relying on that isn't safe — an unnormalized email here could create a
  // second account that never matches the user's existing password account.
  const googleEmail = payload.email.toLowerCase();

  let user = await prisma.user.findFirst({ where: { OR: [{ googleId: payload.sub }, { email: googleEmail }] } });

  if (!user) {
    const base = googleEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || "user";
    let suggestedUsername = base;
    let n = 1;
    while (await prisma.user.findUnique({ where: { username: suggestedUsername } })) suggestedUsername = `${base}${n++}`;
    return res.json({ needsSetup: true, email: googleEmail, suggestedUsername });
  }

  if (!user.googleId) {
    user = await prisma.user.update({ where: { id: user.id }, data: { googleId: payload.sub, avatarUrl: user.avatarUrl ?? payload.picture ?? null } });
  }

  res.json({ token: sign(user), user: publicUser(user) });
});

// Step 2 for a brand-new Google account: re-verify the same credential, then
// actually create the user with the username/password they just chose.
router.post("/google/complete", async (req: Request, res: Response): Promise<any> => {
  if (!GOOGLE_CLIENT_ID) return res.status(500).json({ error: "Google Sign-In not configured on this server yet" });
  const { credential, username, password } = req.body;
  if (!credential || !username || !password) return res.status(400).json({ error: "All fields required" });
  if (username.trim().length < 3) return res.status(400).json({ error: "Username must be at least 3 characters." });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    return res.status(400).json({ error: "Invalid Google token" });
  }
  if (!payload?.email) return res.status(400).json({ error: "Invalid Google token" });
  const googleEmail = payload.email.toLowerCase();

  const existing = await prisma.user.findFirst({ where: { OR: [{ googleId: payload.sub }, { email: googleEmail }] } });
  if (existing) return res.status(400).json({ error: "An account with this Google email already exists." });

  const existingUsername = await prisma.user.findUnique({ where: { username: username.trim() } });
  if (existingUsername) return res.status(400).json({ error: "That username is already taken." });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email: googleEmail,
      username: username.trim(),
      passwordHash,
      googleId: payload.sub,
      avatarUrl: payload.picture ?? null,
    },
  });

  res.json({ token: sign(user), user: publicUser(user) });
});

export default router;
