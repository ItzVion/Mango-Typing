import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { sendOtpEmail } from "../lib/mailer";
import { prisma } from "../lib/db";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "vc-typing-secret-key";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

function sign(user: { id: string; username: string }) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
}

function publicUser(user: { id: string; username: string; email: string; avatarUrl: string | null; hasDonated: boolean; role: string }) {
  return { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl, hasDonated: user.hasDonated, isOwner: user.role === "OWNER" };
}

// Step 1 of registration: validate + stash the pending account, email a 6-digit
// code, and wait for /verify-otp. Mirrors deathsmp-web's register -> OTP flow.
router.post("/register", async (req: Request, res: Response): Promise<any> => {
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
    update: { token: otp, expiresAt, username: username.trim(), passwordHash },
    create: { email: normalEmail, token: otp, expiresAt, username: username.trim(), passwordHash },
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
  const { email, token } = req.body;
  const normalEmail = String(email || "").trim().toLowerCase();
  const row = await prisma.otpToken.findUnique({ where: { email: normalEmail } });
  if (!row) return res.status(400).json({ error: "No pending registration for this email." });
  if (row.token !== String(token)) return res.status(400).json({ error: "Invalid code." });
  if (row.expiresAt < new Date()) return res.status(400).json({ error: "Code expired. Request a new one." });

  const user = await prisma.user.create({
    data: { email: row.email, username: row.username, passwordHash: row.passwordHash },
  });
  await prisma.otpToken.delete({ where: { email: normalEmail } });

  res.json({ token: sign(user), user: publicUser(user) });
});

router.post("/resend-otp", async (req: Request, res: Response): Promise<any> => {
  const { email } = req.body;
  const normalEmail = String(email || "").trim().toLowerCase();
  const row = await prisma.otpToken.findUnique({ where: { email: normalEmail } });
  if (!row) return res.status(400).json({ error: "No pending registration found." });

  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.otpToken.update({ where: { email: normalEmail }, data: { token: otp, expiresAt } });

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

  const user = id.includes("@")
    ? await prisma.user.findUnique({ where: { email: id.toLowerCase() } })
    : await prisma.user.findUnique({ where: { username: id } });

  if (!user) return res.status(400).json({ error: "No account found." });
  if (!user.passwordHash) return res.status(400).json({ error: "This account uses Google sign-in. Please continue with Google." });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(400).json({ error: "Incorrect password." });

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

  let user = await prisma.user.findFirst({ where: { OR: [{ googleId: payload.sub }, { email: payload.email }] } });

  if (!user) {
    const base = payload.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || "user";
    let suggestedUsername = base;
    let n = 1;
    while (await prisma.user.findUnique({ where: { username: suggestedUsername } })) suggestedUsername = `${base}${n++}`;
    return res.json({ needsSetup: true, email: payload.email, suggestedUsername });
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

  const existing = await prisma.user.findFirst({ where: { OR: [{ googleId: payload.sub }, { email: payload.email }] } });
  if (existing) return res.status(400).json({ error: "An account with this Google email already exists." });

  const existingUsername = await prisma.user.findUnique({ where: { username: username.trim() } });
  if (existingUsername) return res.status(400).json({ error: "That username is already taken." });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email: payload.email,
      username: username.trim(),
      passwordHash,
      googleId: payload.sub,
      avatarUrl: payload.picture ?? null,
    },
  });

  res.json({ token: sign(user), user: publicUser(user) });
});

export default router;
