import { Router, Request, Response } from "express";
import dns from "dns/promises";
import net from "net";
import { requireOwner, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/db";
import { getTransporter } from "../lib/mailer";
import { encryptSecret } from "../lib/secretCrypto";

// VC-10: /smtp-test connects out to whatever host is currently saved in
// Settings. That host is owner-set, but the route itself just takes a
// request and makes the server open a socket to it — the textbook SSRF
// shape. Even though this app runs on Vercel (no real "internal network" to
// pivot into), block loopback/private/link-local/metadata-range targets so
// this can't be repurposed as a network probe against whatever environment
// it happens to run in, now or after a future infra change.
function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata (169.254.169.254)
    if (a === 0) return true;
    return false;
  }

  const lower = ip.toLowerCase();

  // dns.lookup() can return IPv4 addresses as IPv4-mapped IPv6 addresses
  // (for example ::ffff:127.0.0.1). Normalize those before applying the
  // IPv4 private/loopback checks, otherwise an SSRF filter can be bypassed.
  const mappedIpv4 = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mappedIpv4) return isBlockedIp(mappedIpv4[1]);

  return (
    lower === "::1" ||
    lower === "::" ||
    lower.startsWith("fe80:") ||
    lower.startsWith("fc") ||
    lower.startsWith("fd")
  );
}

async function assertSmtpHostAllowed(host: string): Promise<void> {
  const addrs = await dns.lookup(host, { all: true });
  if (addrs.length === 0) throw new Error("Could not resolve SMTP host.");
  if (addrs.some((a) => isBlockedIp(a.address))) {
    throw new Error("That SMTP host resolves to a blocked/internal address.");
  }
}

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
    supportEmail: s?.supportEmail ?? "support@mangotyping.fun",
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Owner only: verify the current SMTP settings actually work, optionally
// sending a real test email. Never echoes the password back.
router.post("/smtp-test", requireOwner, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const s = await prisma.settings.findUnique({ where: { id: 1 } });
    const host = s?.smtpHost || process.env.SMTP_HOST;
    if (host) await assertSmtpHostAllowed(host);

    const to = typeof req.body?.to === "string" && req.body.to.trim() ? req.body.to.trim() : null;
    if (to && !EMAIL_RE.test(to)) {
      return res.status(400).json({ error: "That doesn't look like a valid email address." });
    }

    const { transporter, from } = await getTransporter();
    await transporter.verify();
    if (to) {
      await transporter.sendMail({
        from,
        to,
        subject: "MangoTyping SMTP test",
        html: `<p>This is a test email from MangoTyping's admin panel. If you got this, SMTP is working.</p>`,
      });
    }
    res.json({ ok: true, sentTo: to });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "SMTP verification failed" });
  }
});

export default router;
