import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// SMTP config can be edited live from Admin (stored in Settings) — falls
// back to env vars if the admin hasn't set anything in the DB yet. We build
// a fresh transporter per send rather than once at module load, since the
// admin can change these values at any time without a redeploy.
async function getTransporter() {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  const host = s?.smtpHost || process.env.SMTP_HOST;
  const port = s?.smtpPort ?? Number(process.env.SMTP_PORT) || 587;
  const secure = s?.smtpSecure ?? process.env.SMTP_SECURE === "true";
  const user = s?.smtpUser || process.env.SMTP_USER;
  const pass = s?.smtpPass || process.env.SMTP_PASS;
  const from = s?.smtpFrom || process.env.SMTP_FROM || user;
  const fromName = s?.smtpFromName || process.env.SMTP_FROM_NAME || "VC Typing";

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return { transporter, from: fromName ? `"${fromName}" <${from}>` : from };
}

export async function sendOtpEmail(email: string, otp: string) {
  const { transporter, from } = await getTransporter();
  await transporter.sendMail({
    from,
    to: email,
    subject: `${otp} is your VC Typing verification code`,
    html: `<div style="background:#0a0a0a;color:#fff;padding:48px 40px;font-family:Inter,sans-serif;max-width:480px;margin:auto;border-radius:16px;border:1px solid rgba(255,255,255,0.08)"><h2 style="margin:0 0 8px;color:#fff;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em">VC Typing</h2><p style="margin:0 0 32px;color:#71717a;font-size:14px">Verify your email to continue.</p><p style="margin:0 0 12px;color:#a1a1aa;font-size:13px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700">Your code</p><div style="background:#111;border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:24px;text-align:center;letter-spacing:0.5em;font-size:36px;font-weight:900;color:#fff">${otp}</div><p style="margin:24px 0 0;color:#52525b;font-size:13px">Expires in 10 minutes. Never share this code.</p></div>`,
  });
}
