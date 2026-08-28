import { Router, Request, Response } from "express";
import { requireOwner, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/db";
import { getTransporter } from "../lib/mailer";

const router = Router();

// Sent to the browser in place of a stored secret so the admin can see
// "something is set" without the actual value ever leaving the server.
// PATCH treats this exact string as "leave unchanged" for that field.
const MASK = "••••••••";

// Public: donation blurb + whether Razorpay is configured (never leaks the key secret).
router.get("/public", async (_req: Request, res: Response) => {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  res.json({
    donationMessage: s?.donationMessage ?? "",
    razorpayConfigured: !!(s?.razorpayKeyId && s?.razorpayKeySecret),
    razorpayKeyId: s?.razorpayKeyId ?? null, // publishable key id — safe to expose, needed by checkout.js
    maintenanceMode: s?.maintenanceMode ?? false,
    supportEmail: s?.supportEmail ?? "vctyping.11@gmail.com",
  });
});

// Owner only: settings for editing on /admin. Secrets are masked — the raw
// values never leave the server once saved.
router.get("/", requireOwner, async (_req: AuthRequest, res: Response) => {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  res.json({
    ...s,
    razorpayKeySecret: s?.razorpayKeySecret ? MASK : "",
    smtpPass: s?.smtpPass ? MASK : "",
  });
});

router.patch("/", requireOwner, async (req: AuthRequest, res: Response) => {
  const {
    razorpayKeyId, razorpayKeySecret, donationMessage, maintenanceMode, supportEmail,
    smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpFrom, smtpFromName,
  } = req.body;

  // Leave masked/untouched secret fields alone instead of overwriting the
  // real stored value with the placeholder string.
  const keepSecret = razorpayKeySecret === MASK;
  const keepSmtpPass = smtpPass === MASK;

  const s = await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      ...(razorpayKeyId !== undefined ? { razorpayKeyId } : {}),
      ...(razorpayKeySecret !== undefined && !keepSecret ? { razorpayKeySecret } : {}),
      ...(donationMessage !== undefined ? { donationMessage } : {}),
      ...(maintenanceMode !== undefined ? { maintenanceMode } : {}),
      ...(supportEmail !== undefined ? { supportEmail } : {}),
      ...(smtpHost !== undefined ? { smtpHost } : {}),
      ...(smtpPort !== undefined ? { smtpPort: smtpPort === "" ? null : Number(smtpPort) } : {}),
      ...(smtpSecure !== undefined ? { smtpSecure } : {}),
      ...(smtpUser !== undefined ? { smtpUser } : {}),
      ...(smtpPass !== undefined && !keepSmtpPass ? { smtpPass } : {}),
      ...(smtpFrom !== undefined ? { smtpFrom } : {}),
      ...(smtpFromName !== undefined ? { smtpFromName } : {}),
    },
    create: {
      id: 1, razorpayKeyId, razorpayKeySecret: keepSecret ? null : razorpayKeySecret, donationMessage, maintenanceMode, supportEmail,
      smtpHost, smtpPort: smtpPort ? Number(smtpPort) : null, smtpSecure, smtpUser,
      smtpPass: keepSmtpPass ? null : smtpPass, smtpFrom, smtpFromName,
    },
  });
  res.json({ ...s, razorpayKeySecret: s.razorpayKeySecret ? MASK : "", smtpPass: s.smtpPass ? MASK : "" });
});

// Owner only: verify the current SMTP settings actually work, optionally
// sending a real test email. Never echoes the password back.
router.post("/smtp-test", requireOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { transporter, from } = await getTransporter();
    await transporter.verify();
    const to = typeof req.body?.to === "string" && req.body.to.trim() ? req.body.to.trim() : null;
    if (to) {
      await transporter.sendMail({
        from,
        to,
        subject: "VC Typing SMTP test",
        html: `<p>This is a test email from VC Typing's admin panel. If you got this, SMTP is working.</p>`,
      });
    }
    res.json({ ok: true, sentTo: to });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "SMTP verification failed" });
  }
});

export default router;
