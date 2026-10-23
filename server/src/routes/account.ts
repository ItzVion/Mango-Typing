import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { hashPassword, verifyPassword, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "../lib/password";
import crypto from "crypto";
import multer from "multer";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { sendOtpEmail } from "../lib/mailer";
import { prisma } from "../lib/db";
import { hashCode, codesMatch, MAX_CODE_ATTEMPTS } from "../lib/otp";
import { checkRateLimit, clientIp } from "../lib/rateLimit";
import { sniffImageMime } from "../lib/imageSniff";
import { sign } from "./auth";
import { setAuthCookie, clearAuthCookie } from "../lib/authCookie";

const router = Router();
const CODE_TTL_MS = 10 * 60 * 1000;
const avatarUploadLimits = { fileSize: 500 * 1024, fieldArrayIndexLimit: 10, fieldNestingDepth: 10 };
const avatarUpload = multer({ storage: multer.memoryStorage(), limits: avatarUploadLimits });

// Apply account upload limits before Multer buffers the request body.
async function limitAvatarUpload(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const limit = await checkRateLimit("avatar:acct:" + req.userId, 10, 15 * 60 * 1000);
    if (!limit.ok) return res.status(429).json({ error: "Too many uploads. Please try again later." });
    next();
  } catch (err) {
    next(err);
  }
}
function makeCode() { return crypto.randomInt(100000, 999999).toString(); }
async function issueCode(userId: string, purpose: string, targetEmail: string | null, sendTo: string, emailPurpose: "email-verification" | "password-reset" = "email-verification") {
  const token = makeCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  // The composite unique key and UPSERT prevent multiple active codes for one
  // account/purpose, even when concurrent requests arrive.
  await prisma.verificationCode.upsert({
    where: { userId_purpose: { userId, purpose } },
    update: { token: hashCode(token), targetEmail, expiresAt, attempts: 0, createdAt: new Date() },
    create: { userId, purpose, token: hashCode(token), targetEmail, expiresAt },
  });
  await sendOtpEmail(sendTo, token, emailPurpose);
}

async function consumeCode(userId: string, purpose: string, token: string) {
  const row = await prisma.verificationCode.findFirst({ where: { userId, purpose } });
  if (!row) return { ok: false as const, error: "No pending code. Request a new one." };

  const now = new Date();
  if (row.expiresAt <= now) {
    await prisma.verificationCode.deleteMany({ where: { id: row.id, expiresAt: { lte: now } } });
    return { ok: false as const, error: "Code expired. Request a new one." };
  }
  if (row.attempts >= MAX_CODE_ATTEMPTS) {
    await prisma.verificationCode.deleteMany({ where: { id: row.id, attempts: { gte: MAX_CODE_ATTEMPTS } } });
    return { ok: false as const, error: "Too many incorrect attempts. Request a new code." };
  }

  if (!codesMatch(String(token), row.token)) {
    const changed = await prisma.verificationCode.updateMany({
      where: { id: row.id, userId, purpose, attempts: { lt: MAX_CODE_ATTEMPTS }, expiresAt: { gt: now } },
      data: { attempts: { increment: 1 } },
    });
    if (changed.count === 1) {
      await prisma.verificationCode.deleteMany({ where: { id: row.id, attempts: { gte: MAX_CODE_ATTEMPTS } } });
    }
    return { ok: false as const, error: "Invalid code." };
  }

  // Only one concurrent request can conditionally delete and consume a code.
  const consumed = await prisma.verificationCode.deleteMany({
    where: {
      id: row.id, userId, purpose, token: row.token,
      attempts: { lt: MAX_CODE_ATTEMPTS }, expiresAt: { gt: now },
    },
  });
  if (consumed.count !== 1) {
    return { ok: false as const, error: "Invalid or expired code." };
  }
  return { ok: true as const, targetEmail: row.targetEmail };
}

const RESET_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public password-reset endpoints. Responses do not confirm whether an email
// is registered. Codes are hashed at rest, expire after 10 minutes, are
// single-use, and share the existing per-code attempt limit.
router.post("/password-reset/request", async (req: Request, res: Response): Promise<any> => {
  const ipLimit = await checkRateLimit(`password-reset-request:ip:${clientIp(req)}`, 5, 15 * 60 * 1000);
  if (!ipLimit.ok) return res.status(429).json({ error: "Too many requests. Please try again later." });

  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!RESET_EMAIL_RE.test(email) || email.length > 254) return res.status(400).json({ error: "Enter a valid email address." });
  const emailLimit = await checkRateLimit(`password-reset-request:email:${email}`, 3, 60 * 60 * 1000);
  if (!emailLimit.ok) return res.status(429).json({ error: "Too many requests. Please try again later." });

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    try {
      await issueCode(user.id, "password_reset", null, user.email, "password-reset");
    } catch (err) {
      // Keep the response generic to avoid leaking account existence.
      console.error("Password reset email failed:", err);
    }
  }
  return res.json({ success: true, message: "If an account exists for that email address, a password reset code has been sent." });
});

router.post("/password-reset/confirm", async (req: Request, res: Response): Promise<any> => {
  const { email: rawEmail, code, newPassword } = req.body || {};
  const email = String(rawEmail || "").trim().toLowerCase();
  const ipLimit = await checkRateLimit(`password-reset-confirm:ip:${clientIp(req)}`, 10, 15 * 60 * 1000);
  if (!ipLimit.ok) return res.status(429).json({ error: "Too many attempts. Please try again later." });
  if (!RESET_EMAIL_RE.test(email) || email.length > 254 || typeof code !== "string" || !/^\d{6}$/.test(code) || typeof newPassword !== "string") {
    return res.status(400).json({ error: "Invalid or expired reset code." });
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > MAX_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.` });
  }
  const emailLimit = await checkRateLimit(`password-reset-confirm:email:${email}`, 8, 15 * 60 * 1000);
  if (!emailLimit.ok) return res.status(429).json({ error: "Too many attempts. Please try again later." });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(400).json({ error: "Invalid or expired reset code." });
  const result = await consumeCode(user.id, "password_reset", code);
  if (!result.ok) return res.status(400).json({ error: "Invalid or expired reset code." });

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword), sessionVersion: { increment: 1 } },
  });
  return res.json({ success: true });
});

router.patch("/username", requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const limit = await checkRateLimit(`username-change:acct:${req.userId}`, 5, 15 * 60 * 1000); if (!limit.ok) return res.status(429).json({ error: "Too many attempts. Please try again later." });
  const { newUsername, password } = req.body; if (!newUsername || !password) return res.status(400).json({ error: "All fields required." });
  const trimmed = String(newUsername).trim(); if (trimmed.length < 3 || trimmed.length > 32) return res.status(400).json({ error: "Username must be between 3 and 32 characters." });
  const user = await prisma.user.findUnique({ where: { id: req.userId } }); if (!user) return res.status(404).json({ error: "User not found." }); if (!user.passwordHash) return res.status(400).json({ error: "This account uses Google sign-in and has no password set." });
  const valid = await verifyPassword(password, user.passwordHash) || (user.passwordHash.startsWith("$2") && await bcrypt.compare(password, user.passwordHash)); if (!valid) return res.status(400).json({ error: "Incorrect password." });
  const taken = await prisma.user.findUnique({ where: { username: trimmed } }); if (taken && taken.id !== user.id) return res.status(400).json({ error: "That username is already taken." });
  const updated = await prisma.user.update({ where: { id: user.id }, data: { username: trimmed } }); res.json({ success: true, username: updated.username });
});
router.patch("/password", requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const limit = await checkRateLimit(`password-change:acct:${req.userId}`, 5, 15 * 60 * 1000); if (!limit.ok) return res.status(429).json({ error: "Too many attempts. Please try again later." });
  const { oldPassword, newPassword, confirmNewPassword } = req.body; if (!oldPassword || !newPassword || !confirmNewPassword) return res.status(400).json({ error: "All fields required." });
  if (newPassword !== confirmNewPassword) return res.status(400).json({ error: "New passwords don't match." });
  if (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > MAX_PASSWORD_LENGTH) return res.status(400).json({ error: `New password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.` });
  const user = await prisma.user.findUnique({ where: { id: req.userId } }); if (!user) return res.status(404).json({ error: "User not found." }); if (!user.passwordHash) return res.status(400).json({ error: "This account uses Google sign-in and has no password set." });
  const valid = await verifyPassword(oldPassword, user.passwordHash) || (user.passwordHash.startsWith("$2") && await bcrypt.compare(oldPassword, user.passwordHash)); if (!valid) return res.status(400).json({ error: "Current password is incorrect." });
  const passwordHash = await hashPassword(newPassword); const updated = await prisma.user.update({ where: { id: user.id }, data: { passwordHash, sessionVersion: { increment: 1 } } });
  setAuthCookie(res, sign(updated)); res.json({ success: true });
});
router.post("/email/request", requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const limit = await checkRateLimit(`email-change:acct:${req.userId}`, 5, 15 * 60 * 1000); if (!limit.ok) return res.status(429).json({ error: "Too many attempts. Please try again later." });
  const { password } = req.body; if (!password) return res.status(400).json({ error: "Password required." }); const user = await prisma.user.findUnique({ where: { id: req.userId } }); if (!user) return res.status(404).json({ error: "User not found." }); if (!user.passwordHash) return res.status(400).json({ error: "This account uses Google sign-in and has no password set." });
  const valid = await verifyPassword(password, user.passwordHash) || (user.passwordHash.startsWith("$2") && await bcrypt.compare(password, user.passwordHash)); if (!valid) return res.status(400).json({ error: "Incorrect password." });
  try { await issueCode(user.id, "email_old", null, user.email); } catch (err) { console.error("Failed to send old-email verification code:", err); return res.status(500).json({ error: "Couldn't send verification email." }); } res.json({ success: true });
});
router.post("/email/verify-old", requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const { code, newEmail } = req.body || {};
  const normalNewEmail = typeof newEmail === "string" ? newEmail.trim().toLowerCase() : "";
  if (typeof code !== "string" || !/^\d{6}$/.test(code) || !RESET_EMAIL_RE.test(normalNewEmail) || normalNewEmail.length > 254) {
    return res.status(400).json({ error: "Enter a valid email address and verification code." });
  }
  const limit = await checkRateLimit("email-change-verify-old:acct:" + req.userId, 8, 15 * 60 * 1000);
  if (!limit.ok) return res.status(429).json({ error: "Too many attempts. Please try again later." });
  const existing = await prisma.user.findUnique({ where: { email: normalNewEmail } });
  if (existing) return res.status(400).json({ error: "That email is already in use." });
  const result = await consumeCode(req.userId!, "email_old", code);
  if (!result.ok) return res.status(400).json({ error: result.error });
  try {
    await issueCode(req.userId!, "email_new", normalNewEmail, normalNewEmail);
  } catch (err) {
    console.error("Failed to send new-email verification code:", err);
    return res.status(500).json({ error: "Couldn't send verification email." });
  }
  res.json({ success: true });
});
router.post("/email/verify-new", requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const { code } = req.body || {};
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) return res.status(400).json({ error: "Code required." });
  const limit = await checkRateLimit("email-change-verify-new:acct:" + req.userId, 8, 15 * 60 * 1000);
  if (!limit.ok) return res.status(429).json({ error: "Too many attempts. Please try again later." });
  const result = await consumeCode(req.userId!, "email_new", code);
  if (!result.ok) return res.status(400).json({ error: result.error });
  if (!result.targetEmail || !RESET_EMAIL_RE.test(result.targetEmail) || result.targetEmail.length > 254) {
    return res.status(400).json({ error: "Something went wrong. Start over." });
  }
  try {
    const updated = await prisma.user.update({ where: { id: req.userId }, data: { email: result.targetEmail } });
    res.json({ success: true, email: updated.email });
  } catch (err: any) {
    if (err?.code === "P2002") return res.status(409).json({ error: "That email is already in use." });
    throw err;
  }
});
router.post("/delete/request", requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const limit = await checkRateLimit("delete-account-request:acct:" + req.userId, 3, 60 * 60 * 1000);
  if (!limit.ok) return res.status(429).json({ error: "Too many attempts. Please try again later." });
  const { password } = req.body || {};
  if (typeof password !== "string" || !password) return res.status(400).json({ error: "Password required." }); const user = await prisma.user.findUnique({ where: { id: req.userId } }); if (!user) return res.status(404).json({ error: "User not found." }); if (!user.passwordHash) return res.status(400).json({ error: "This account uses Google sign-in and has no password set." }); const valid = await verifyPassword(password, user.passwordHash) || (user.passwordHash.startsWith("$2") && await bcrypt.compare(password, user.passwordHash)); if (!valid) return res.status(400).json({ error: "Incorrect password." }); try { await issueCode(user.id, "delete_account", null, user.email); } catch { return res.status(500).json({ error: "Couldn't send verification email." }); } res.json({ success: true }); });
router.post("/delete/confirm", requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const limit = await checkRateLimit("delete-account-confirm:acct:" + req.userId, 8, 15 * 60 * 1000);
  if (!limit.ok) return res.status(429).json({ error: "Too many attempts. Please try again later." });
  const { code } = req.body || {};
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) return res.status(400).json({ error: "Code required." }); const result = await consumeCode(req.userId!, "delete_account", code); if (!result.ok) return res.status(400).json({ error: result.error }); await prisma.$transaction([prisma.donation.deleteMany({ where: { userId: req.userId } }), prisma.typingTest.deleteMany({ where: { userId: req.userId } }), prisma.verificationCode.deleteMany({ where: { userId: req.userId } }), prisma.user.delete({ where: { id: req.userId } })]); clearAuthCookie(res); res.json({ success: true }); });
router.post("/avatar", requireAuth, limitAvatarUpload, avatarUpload.single("avatar"), async (req: AuthRequest, res: Response): Promise<any> => { if (!req.file) return res.status(400).json({ error: "No file uploaded." }); const mime = sniffImageMime(req.file.buffer); if (!mime) return res.status(400).json({ error: "That doesn't look like a valid image file." }); const dataUrl = `data:${mime};base64,${req.file.buffer.toString("base64")}`; const user = await prisma.user.update({ where: { id: req.userId }, data: { avatarUrl: dataUrl } }); res.json({ avatarUrl: user.avatarUrl }); });
router.delete("/avatar", requireAuth, async (req: AuthRequest, res: Response) => { await prisma.user.update({ where: { id: req.userId }, data: { avatarUrl: null } }); res.json({ success: true }); });
export default router;
