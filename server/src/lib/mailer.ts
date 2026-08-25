import nodemailer from "nodemailer";

// Reuses the same SMTP-style env vars as deathsmp-web so the same mail
// provider/account can be pointed at both apps if desired:
// SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS
export const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export async function sendOtpEmail(email: string, otp: string) {
  await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: `${otp} is your VC Typing verification code`,
    html: `<div style="background:#0a0a0a;color:#fff;padding:48px 40px;font-family:Inter,sans-serif;max-width:480px;margin:auto;border-radius:16px;border:1px solid rgba(255,255,255,0.08)"><h2 style="margin:0 0 8px;color:#fff;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em">VC Typing</h2><p style="margin:0 0 32px;color:#71717a;font-size:14px">Verify your email to continue.</p><p style="margin:0 0 12px;color:#a1a1aa;font-size:13px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700">Your code</p><div style="background:#111;border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:24px;text-align:center;letter-spacing:0.5em;font-size:36px;font-weight:900;color:#fff">${otp}</div><p style="margin:24px 0 0;color:#52525b;font-size:13px">Expires in 10 minutes. Never share this code.</p></div>`,
  });
}
