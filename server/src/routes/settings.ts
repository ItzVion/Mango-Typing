import { Router, Request, Response } from "express";
import { requireOwner, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/db";

const router = Router();

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

// Owner only: full settings including the secret, for editing on /payedit.
router.get("/", requireOwner, async (_req: AuthRequest, res: Response) => {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  res.json(s);
});

router.patch("/", requireOwner, async (req: AuthRequest, res: Response) => {
  const {
    razorpayKeyId, razorpayKeySecret, donationMessage, maintenanceMode, supportEmail,
    smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpFrom, smtpFromName,
  } = req.body;
  const s = await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      ...(razorpayKeyId !== undefined ? { razorpayKeyId } : {}),
      ...(razorpayKeySecret !== undefined ? { razorpayKeySecret } : {}),
      ...(donationMessage !== undefined ? { donationMessage } : {}),
      ...(maintenanceMode !== undefined ? { maintenanceMode } : {}),
      ...(supportEmail !== undefined ? { supportEmail } : {}),
      ...(smtpHost !== undefined ? { smtpHost } : {}),
      ...(smtpPort !== undefined ? { smtpPort: smtpPort === "" ? null : Number(smtpPort) } : {}),
      ...(smtpSecure !== undefined ? { smtpSecure } : {}),
      ...(smtpUser !== undefined ? { smtpUser } : {}),
      ...(smtpPass !== undefined ? { smtpPass } : {}),
      ...(smtpFrom !== undefined ? { smtpFrom } : {}),
      ...(smtpFromName !== undefined ? { smtpFromName } : {}),
    },
    create: {
      id: 1, razorpayKeyId, razorpayKeySecret, donationMessage, maintenanceMode, supportEmail,
      smtpHost, smtpPort: smtpPort ? Number(smtpPort) : null, smtpSecure, smtpUser, smtpPass, smtpFrom, smtpFromName,
    },
  });
  res.json(s);
});

export default router;
