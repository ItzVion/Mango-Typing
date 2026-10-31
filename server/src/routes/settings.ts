import { Router, Request, Response } from "express";
import { requireOwner, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/db";
import { getTransporter } from "../lib/mailer";
import { encryptSecret } from "../lib/secretCrypto";
import { getCurrentLegalVersion } from "../lib/legal";
import { checkRateLimit, clientIp } from "../lib/rateLimit";
import { resolvePublicSmtpHost } from "../lib/smtpSecurity";

const router = Router();
const MASK = "••••••••";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get("/public", async (_req: Request, res: Response) => {
  const [s, legalVersion] = await Promise.all([prisma.settings.findUnique({ where: { id: 1 } }), getCurrentLegalVersion()]);
  // Maintenance toggles must take effect promptly; stale CDN/browser copies
  // can otherwise keep visitors on the wrong screen for over a minute.
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.json({
    donationMessage: s?.donationMessage ?? "",
    razorpayConfigured: !!(s?.razorpayKeyId && s?.razorpayKeySecret),
    razorpayKeyId: s?.razorpayKeyId ?? null,
    maintenanceMode: s?.maintenanceMode ?? false,
    qrMode: s?.qrMode ?? false,
    supportEmail: s?.supportEmail ?? "support@mangotyping.fun",
    legalVersion,
  });
});

router.get("/", requireOwner, async (_req: AuthRequest, res: Response) => {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  res.json({ ...s, razorpayKeySecret: s?.razorpayKeySecret ? MASK : "", smtpPass: s?.smtpPass ? MASK : "" });
});

router.patch("/", requireOwner, async (req: AuthRequest, res: Response) => {
  const { razorpayKeyId, razorpayKeySecret, donationMessage, maintenanceMode, qrMode, supportEmail, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpFrom, smtpFromName } = req.body || {};
  const keepSecret = razorpayKeySecret === MASK;
  const keepSmtpPass = smtpPass === MASK;

  if (qrMode !== undefined && typeof qrMode !== "boolean") return res.status(400).json({ error: "Invalid QR mode value." });
  if (supportEmail !== undefined && (typeof supportEmail !== "string" || supportEmail.length > 254 || !EMAIL_RE.test(supportEmail))) return res.status(400).json({ error: "Invalid support email." });
  if (donationMessage !== undefined && (typeof donationMessage !== "string" || donationMessage.length > 4000)) return res.status(400).json({ error: "Donation message is too long." });
  if (smtpHost !== undefined && (typeof smtpHost !== "string" || smtpHost.length > 253)) return res.status(400).json({ error: "Invalid SMTP host." });
  if (smtpPort !== undefined && smtpPort !== "" && (!Number.isInteger(Number(smtpPort)) || Number(smtpPort) < 1 || Number(smtpPort) > 65535)) return res.status(400).json({ error: "Invalid SMTP port." });
  if (smtpUser !== undefined && (typeof smtpUser !== "string" || smtpUser.length > 320)) return res.status(400).json({ error: "Invalid SMTP username." });
  if (smtpFrom !== undefined && (typeof smtpFrom !== "string" || smtpFrom.length > 254 || !EMAIL_RE.test(smtpFrom))) return res.status(400).json({ error: "Invalid SMTP sender address." });
  if (smtpFromName !== undefined && (typeof smtpFromName !== "string" || smtpFromName.length > 120)) return res.status(400).json({ error: "SMTP sender name is too long." });

  if (smtpHost) {
    try { await resolvePublicSmtpHost(smtpHost); }
    catch { return res.status(400).json({ error: "SMTP host must resolve only to public addresses." }); }
  }

  const s = await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      ...(razorpayKeyId !== undefined ? { razorpayKeyId } : {}),
      ...(razorpayKeySecret !== undefined && !keepSecret ? { razorpayKeySecret: encryptSecret(razorpayKeySecret) } : {}),
      ...(donationMessage !== undefined ? { donationMessage } : {}),
      ...(maintenanceMode !== undefined ? { maintenanceMode } : {}),
      ...(qrMode !== undefined ? { qrMode } : {}),
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
      id: 1, razorpayKeyId, razorpayKeySecret: keepSecret || !razorpayKeySecret ? null : encryptSecret(razorpayKeySecret), donationMessage, maintenanceMode, qrMode: qrMode ?? false, supportEmail,
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
    if (!host) return res.status(400).json({ error: "SMTP host is not configured." });
    await resolvePublicSmtpHost(host);
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
