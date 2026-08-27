import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { requireOwner, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

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
  const { razorpayKeyId, razorpayKeySecret, donationMessage, maintenanceMode, supportEmail } = req.body;
  const s = await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      ...(razorpayKeyId !== undefined ? { razorpayKeyId } : {}),
      ...(razorpayKeySecret !== undefined ? { razorpayKeySecret } : {}),
      ...(donationMessage !== undefined ? { donationMessage } : {}),
      ...(maintenanceMode !== undefined ? { maintenanceMode } : {}),
      ...(supportEmail !== undefined ? { supportEmail } : {}),
    },
    create: { id: 1, razorpayKeyId, razorpayKeySecret, donationMessage, maintenanceMode, supportEmail },
  });
  res.json(s);
});

export default router;
