import { Router, Request, Response } from "express";
import dns from "dns/promises";
import net from "net";
import { requireOwner, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/db";
import { getTransporter } from "../lib/mailer";
import { encryptSecret } from "../lib/secretCrypto";
import { getCurrentLegalVersion } from "../lib/legal";
import { checkRateLimit, clientIp } from "../lib/rateLimit";

function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || a === 0) return true;
    return false;
  }
  const lower = ip.toLowerCase();
  const mappedIpv4 = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mappedIpv4) return isBlockedIp(mappedIpv4[1]);
  return lower === "::1" || lower === "::" || lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd");
}

async function assertSmtpHostAllowed(host: string): Promise<void> {
  if (!host || host.length > 253 || /[\s\0-\x1f\x7f]/.test(host)) throw new Error("Invalid SMTP host.");
  const addrs = await dns.lookup(host, { all: true });
  if (addrs.length === 0 || addrs.some((a) => isBlockedIp(a.address))) throw new Error("That SMTP host resolves to a blocked/internal address.");
}

const router = Router();
const MASK = "••••••••";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get("/public", async (_req: Request, res: Response) => {
  const [s, legalVersion] = await Promise.all([prisma.settings.findUnique({ where: { id: 1 } }), getCurrentLegalVersion()]);
  res.setHeader("Cache-Control", "public, max-age=30, s-maxage=30, stale-while-revalidate=60");
  res.json({
    donationMessage: s?.donationMessage ?? "",
    razorpayConfigured: !!(s?.razorpayKeyId && s?.razorpayKeySecret),
    razorpayKeyId: s?.razorpayKeyId ?? null,
    maintenanceMode: s?.maintenanceMode ?? false,
    supportEmail: s?.supportEmail ?? "support@mangotyping.fun",
    legalVersion,
  });
});

router.get("/", requireOwner, async (_req: AuthRequest, res: Response) => {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  res.json({ ...s, razorpayKeySecret: s?.razorpayKeySecret ? MASK : "", smtpPass: s?.smtpPass ? MASK : "" });
});

router.patch("/", requireOwner, async (req: AuthRequest, res: Response) => {
  const { razorpayKeyId, razorpayKeySecret, donationMessage, maintenanceMode, supportEmail, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpFrom, smtpFromName } = req.body || {};
  const keepSecret = razorpayKeySecret === MASK;
  const keepSmtpPass = smtpPass === MASK;

  if (supportEmail !== undefined && (typeof supportEmail !== "string" || supportEmail.length > 254 || !EMAIL_RE.test(supportEmail))) return res.status(400).json({ error: "Invalid support email." });
  if (donationMessage !== undefined && (typeof donationMessage !== "string" || donationMessage.length > 4000)) return res.status(400).json({ error: "Donation message is too long." });
  if (smtpHost !== undefined && (typeof smtpHost !== "string" || smtpHost.length > 253)) return res.status(400).json({ error: "Invalid SMTP host." });
  if (smtpPort !== undefined && smtpPort !== "" && (!Number.isInteger(Number(smtpPort)) || Number(smtpPort) < 1 || Number(smtpPort) > 65535)) return res.status(400).json({ error: "Invalid SMTP port." });
  if (smtpUser !== undefined && (typeof smtpUser !== "string" || smtpUser.length > 320)) return res.status(400).json({ error: "Invalid SMTP username." });
  if (smtpFrom !== undefined && (typeof smtpFrom !== "string" || smtpFrom.length > 254 || !EMAIL_RE.test(smtpFrom))) return res.status(400).json({ error: "Invalid SMTP sender address." });
  if (smtpFromName !== undefined && (typeof smtpFromName !== "string" || smtpFromName.length > 120)) return res.status(400).json({ error: "SMTP sender name is too long." });

  if (smtpHost) await assertSmtpHostAllowed(smtpHost);

  const s = await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      ...(razorpayKeyId !== undefined ? { razorpayKeyId } : {}),
      ...(razorpayKeySecret !== undefined && !keepSecret ? { razorpayKeySecret: encryptSecret(razorpayKeySecret) } : {}),
      ...(donationMessage !== undefined ? { donationMessage } : {}),
      ...(maintenanceMode !== undefined ? { maintenanceMode } : {}),
      ...(supportEmail !== undefined ? { supportEmail } : {}),
      ...(smtpHost !== undefined ? { smtpHost } : {}),
      ...(smtpPort !== undefined ? { smtpPort: smtpPort === "" ? null : Number(smtpPort) } : {}),
      ...(smtpSecure !== undefined ? { smtpSecure } : {}),
      ...(smtpUser !== undefined ? { smtpUser } : {}),
      ...(smtpPass !== undefined && !keepSmtpPass ? { smtpPass: encryptSecret(smtpPass) } : {}),
      ...(smtpFrom !== undefined ? { smtpFrom } : {}),
      ...(smtpFromName !== undefined ? { smtpFromName } : {}),
    },
    create: {
      id: 1, razorpayKeyId, razorpayKeySecret: keepSecret || !razorpayKeySecret ? null : encryptSecret(razorpayKeySecret), donationMessage, maintenanceMode, supportEmail,
      smtpHost, smtpPort: smtpPort ? Number(smtpPort) : null, smtpSecure, smtpUser,
      smtpPass: keepSmtpPass || !smtpPass ? null : encryptSecret(smtpPass), smtpFrom, smtpFromName,
    },
  });
  res.json({ ...s, razorpayKeySecret: s.razorpayKeySecret ? MASK : "", smtpPass: s.smtpPass ? MASK : "" });
});

router.post("/smtp-test", requireOwner, async (req: AuthRequest, res: Response): Promise<any> => {
  const limit = await checkRateLimit(`smtp-test:${clientIp(req)}`, 5, 10 * 60 * 1000);
  if (!limit.ok) return res.status(429).json({ error: "Too many SMTP tests. Please wait and try again." });
  try {
    const s = await prisma.settings.findUnique({ where: { id: 1 } });
    const host = s?.smtpHost || process.env.SMTP_HOST;
    if (host) await assertSmtpHostAllowed(host);
    const to = typeof req.body?.to === "string" && req.body.to.trim() ? req.body.to.trim() : null;
    if (to && (to.length > 254 || !EMAIL_RE.test(to))) return res.status(400).json({ error: "That doesn't look like a valid email address." });
    const { transporter, from } = await getTransporter();
    await transporter.verify();
    if (to) await transporter.sendMail({ from, to, subject: "MangoTyping SMTP test", html: `<p>This is a test email from MangoTyping's admin panel. If you got this, SMTP is working.</p>` });
    res.json({ ok: true, sentTo: to });
  } catch (err: any) {
    res.status(400).json({ error: "SMTP verification failed." });
  }
});

export default router;
