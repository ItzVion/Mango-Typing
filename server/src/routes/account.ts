import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import multer from "multer";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { sendOtpEmail } from "../lib/mailer";
import { prisma } from "../lib/db";
import { hashCode, codesMatch, MAX_CODE_ATTEMPTS } from "../lib/otp";
import { checkRateLimit } from "../lib/rateLimit";
import { sniffImageMime } from "../lib/imageSniff";
import { sign } from "./auth";

const router = Router();
const CODE_TTL_MS = 10 * 60 * 1000;

// Client resizes to a small square before upload, but this is the real
// enforcement point — never trust the browser to have actually done that.
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 }, // 500KB — plenty for a resized square avatar
});

function makeCode() {
  return crypto.randomInt(100000, 999999).toString();
}

async function issueCode(userId: string, purpose: string, targetEmail: string | null, sendTo: string) {
  const token = makeCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  // Only one pending code per (user, purpose) at a time.
  await prisma.verificationCode.deleteMany({ where: { userId, purpose } });
  await prisma.verificationCode.create({
    data: { userId, purpose, token: hashCode(token), targetEmail, expiresAt },
  });
  await sendOtpEmail(sendTo, token);
}

async function consumeCode(userId: string, purpose: string, token: string) {
  const row = await prisma.verificationCode.findFirst({ where: { userId, purpose } });
  if (!row) return { ok: false as const, error: "No pending code. Request a new one." };
  if (row.expiresAt < new Date()) {
    await prisma.verificationCode.delete({ where: { id: row.id } });
    return { ok: false as const, error: "Code expired. Request a new one." };
  }
  if (row.attempts >= MAX_CODE_ATTEMPTS) {
    await prisma.verificationCode.delete({ where: { id: row.id } });
    return { ok: false as const, error: "Too many incorrect attempts. Request a new code." };
  }
  if (!codesMatch(String(token), row.token)) {
    await prisma.verificationCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return { ok: false as const, error: "Invalid code." };
  }
  await prisma.verificationCode.delete({ where: { id: row.id } });
  return { ok: true as const, targetEmail: row.targetEmail };
}

// ---- Username change (requires current password) --------------------------
router.patch("/username", requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const { newUsername, password } = req.body;
  if (!newUsername || !password) return res.status(400).json({ error: "All fields required." });
  const trimmed = String(newUsername).trim();
  if (trimmed.length < 3) return res.status(400).json({ error: "Username must be at least 3 characters." });

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "User not found." });
  if (!user.passwordHash) return res.status(400).json({ error: "This account uses Google sign-in and has no password set." });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(400).json({ error: "Incorrect password." });

  const taken = await prisma.user.findUnique({ where: { username: trimmed } });
  if (taken && taken.id !== user.id) return res.status(400).json({ error: "That username is already taken." });

  const updated = await prisma.user.update({ where: { id: user.id }, data: { username: trimmed } });
  res.json({ success: true, username: updated.username });
});

// ---- Password change (requires current password) ---------------------------
router.patch("/password", requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const { oldPassword, newPassword, confirmNewPassword } = req.body;
  if (!oldPassword || !newPassword || !confirmNewPassword) return res.status(400).json({ error: "All fields required." });
  if (newPassword !== confirmNewPassword) return res.status(400).json({ error: "New passwords don't match." });
  if (newPassword.length < 6) return res.status(400).json({ error: "New password must be at least 6 characters." });

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "User not found." });
  if (!user.passwordHash) return res.status(400).json({ error: "This account uses Google sign-in and has no password set." });

  const valid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!valid) return res.status(400).json({ error: "Current password is incorrect." });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  // Bumping sessionVersion invalidates every other token issued for this
  // account (e.g. a stolen/leaked session) — reissue a fresh one below so
  // the device making this change doesn't get logged out too.
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });
  res.json({ success: true, token: sign(updated) });
});

// ---- Email change: verify OLD email, then verify NEW email -----------------
// Step 1: confirm password, send code to the CURRENT (old) email address.
router.post("/email/request", requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password required." });

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "User not found." });
  if (!user.passwordHash) return res.status(400).json({ error: "This account uses Google sign-in and has no password set." });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(400).json({ error: "Incorrect password." });

  try {
    await issueCode(user.id, "email_old", null, user.email);
  } catch (err) {
    console.error("Failed to send old-email verification code:", err);
    return res.status(500).json({ error: "Couldn't send verification email." });
  }
  res.json({ success: true });
});

// Step 2: confirm the code sent to the OLD email, then send a code to the NEW email.
router.post("/email/verify-old", requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const { code, newEmail } = req.body;
  if (!code || !newEmail) return res.status(400).json({ error: "All fields required." });
  const normalNewEmail = String(newEmail).trim().toLowerCase();

  const result = await consumeCode(req.userId!, "email_old", code);
  if (!result.ok) return res.status(400).json({ error: result.error });

  const existing = await prisma.user.findUnique({ where: { email: normalNewEmail } });
  if (existing) return res.status(400).json({ error: "That email is already in use." });

  try {
    await issueCode(req.userId!, "email_new", normalNewEmail, normalNewEmail);
  } catch (err) {
    console.error("Failed to send new-email verification code:", err);
    return res.status(500).json({ error: "Couldn't send verification email." });
  }
  res.json({ success: true });
});

// Step 3: confirm the code sent to the NEW email, apply the change.
router.post("/email/verify-new", requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Code required." });

  const result = await consumeCode(req.userId!, "email_new", code);
  if (!result.ok) return res.status(400).json({ error: result.error });
  if (!result.targetEmail) return res.status(400).json({ error: "Something went wrong. Start over." });

  const updated = await prisma.user.update({ where: { id: req.userId }, data: { email: result.targetEmail } });
  res.json({ success: true, email: updated.email });
});

// ---- Account deletion: password + email OTP, then hard-delete everything ---
// Step 1: confirm password, send code to the account's current email.
router.post("/delete/request", requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password required." });

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "User not found." });
  if (!user.passwordHash) return res.status(400).json({ error: "This account uses Google sign-in and has no password set." });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(400).json({ error: "Incorrect password." });

  try {
    await issueCode(user.id, "delete_account", null, user.email);
  } catch (err) {
    console.error("Failed to send deletion verification code:", err);
    return res.status(500).json({ error: "Couldn't send verification email." });
  }
  res.json({ success: true });
});

// Step 2: confirm the code, then permanently remove the account and everything
// linked to it — typing test history and donation records included, per the
// account owner's explicit "remove it everywhere" request. Note: this also
// deletes donation/payment records outright rather than anonymizing them,
// which differs from deathsmp-web's anonymize-and-keep approach.
router.post("/delete/confirm", requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Code required." });

  const result = await consumeCode(req.userId!, "delete_account", code);
  if (!result.ok) return res.status(400).json({ error: result.error });

  await prisma.$transaction([
    prisma.donation.deleteMany({ where: { userId: req.userId } }),
    prisma.typingTest.deleteMany({ where: { userId: req.userId } }),
    prisma.verificationCode.deleteMany({ where: { userId: req.userId } }),
    prisma.user.delete({ where: { id: req.userId } }),
  ]);

  res.json({ success: true });
});

export default router;

// ---- Avatar upload ----------------------------------------------------------
// Stored as a data: URL directly on the User row — there's no object storage
// in this stack (Vercel functions have no persistent filesystem), and at a
// 500KB cap a base64'd small square avatar is a trivial amount of DB text.
router.post("/avatar", requireAuth, avatarUpload.single("avatar"), async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });

  const limit = await checkRateLimit(`avatar:acct:${req.userId}`, 10, 15 * 60 * 1000);
  if (!limit.ok) return res.status(429).json({ error: "Too many uploads. Please try again later." });

  const mime = sniffImageMime(req.file.buffer);
  if (!mime) return res.status(400).json({ error: "That doesn't look like a valid image file." });

  const dataUrl = `data:${mime};base64,${req.file.buffer.toString("base64")}`;
  const user = await prisma.user.update({ where: { id: req.userId }, data: { avatarUrl: dataUrl } });
  res.json({ avatarUrl: user.avatarUrl });
});

router.delete("/avatar", requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  await prisma.user.update({ where: { id: req.userId }, data: { avatarUrl: null } });
  res.json({ success: true });
});
