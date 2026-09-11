import nodemailer from "nodemailer";
import { prisma } from "./db";
import { decryptSecret } from "./secretCrypto";

// SMTP config can be edited live from Admin (stored in Settings) — falls
// back to env vars if the admin hasn't set anything in the DB yet. We build
// a fresh transporter per send rather than once at module load, since the
// admin can change these values at any time without a redeploy.
export async function getTransporter() {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  const host = s?.smtpHost || process.env.SMTP_HOST;
  const port = s?.smtpPort ?? (Number(process.env.SMTP_PORT) || 587);
  const secure = s?.smtpSecure ?? process.env.SMTP_SECURE === "true";
  const user = s?.smtpUser || process.env.SMTP_USER;
  const pass = decryptSecret(s?.smtpPass) || process.env.SMTP_PASS;
  const from = s?.smtpFrom || process.env.SMTP_FROM || user;
  const fromName = s?.smtpFromName || process.env.SMTP_FROM_NAME || "MangoTyping";

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  });

  return { transporter, from: fromName ? `"${fromName}" <${from}>` : from };
}

const emailShell = (content: string) => `
  <div style="margin:0;padding:32px 16px;background:#f3f3f0;font-family:Arial,Helvetica,sans-serif;color:#111111;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e5e0;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.06);">
      <div style="height:5px;background:#F5A623;font-size:0;line-height:0;">&nbsp;</div>
      ${content}
    </div>
    <div style="max-width:560px;margin:18px auto 0;text-align:center;color:#8a8a84;font-size:11px;line-height:18px;">
      MangoTyping &bull; Type faster. Have fun.
    </div>
  </div>
`;

// Sent instead of a real OTP when someone tries to register with an email
// that already has an account (see VC-07) — lets /register always return the
// same generic response regardless of whether the email exists, so the
// response itself can't be used to enumerate registered accounts.
export async function sendAccountExistsEmail(email: string) {
  const { transporter, from } = await getTransporter();
  await transporter.sendMail({
    from,
    to: email,
    subject: "Someone tried to register with your email — MangoTyping",
    html: emailShell(`
      <div style="padding:34px 36px 36px;">
        <div style="display:inline-block;background:#111111;color:#F5A623;border-radius:10px;padding:9px 12px;font-size:15px;font-weight:900;letter-spacing:.08em;">MT</div>
        <div style="margin-top:28px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#8a8a84;">Account security</div>
        <h1 style="margin:8px 0 12px;font-size:27px;line-height:34px;letter-spacing:-.02em;color:#111111;">Your MangoTyping account already exists</h1>
        <p style="margin:0 0 22px;color:#5f5f59;font-size:15px;line-height:24px;">Someone just tried to create a new account using this email address.</p>
        <div style="padding:16px 18px;background:#fafaf7;border:1px solid #e8e8e1;border-radius:12px;color:#44443f;font-size:13px;line-height:20px;">If that was you, sign in with your existing account. If it wasn't, no action is needed — your account is safe.</div>
      </div>
    `),
  });
}

export async function sendOtpEmail(email: string, otp: string) {
  const { transporter, from } = await getTransporter();
  await transporter.sendMail({
    from,
    to: email,
    subject: `${otp} is your MangoTyping verification code`,
    html: emailShell(`
      <div style="padding:34px 36px 36px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td>
              <div style="display:inline-block;background:#111111;color:#F5A623;border-radius:10px;padding:9px 12px;font-size:15px;font-weight:900;letter-spacing:.08em;">MT</div>
            </td>
            <td align="right" style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#9a9a93;">Email verification</td>
          </tr>
        </table>

        <h1 style="margin:30px 0 8px;font-size:30px;line-height:36px;letter-spacing:-.03em;color:#111111;">Verify your email</h1>
        <p style="margin:0;color:#666660;font-size:15px;line-height:24px;">Use the verification code below to continue to MangoTyping.</p>

        <div style="margin:28px 0 10px;padding:24px 16px;background:#111111;border-radius:14px;text-align:center;">
          <div style="margin:0 0 8px;color:#a8a8a1;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;">Your code</div>
          <div style="color:#ffffff;font-size:38px;line-height:44px;font-weight:800;letter-spacing:.28em;padding-left:.28em;">${otp}</div>
        </div>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:16px;">
          <tr>
            <td valign="top" style="width:24px;color:#F5A623;font-size:16px;font-weight:900;">&#9679;</td>
            <td style="color:#666660;font-size:13px;line-height:20px;">This code expires in <strong style="color:#33332f;">10 minutes</strong>.</td>
          </tr>
          <tr>
            <td valign="top" style="padding-top:5px;width:24px;color:#F5A623;font-size:16px;font-weight:900;">&#9679;</td>
            <td style="padding-top:5px;color:#666660;font-size:13px;line-height:20px;">Never share this code with anyone.</td>
          </tr>
        </table>

        <div style="height:1px;background:#eeeeea;margin:28px 0 18px;">&nbsp;</div>
        <p style="margin:0;color:#92928b;font-size:11px;line-height:18px;">You received this email because a verification attempt was made for this address. If you didn't request it, you can safely ignore this email.</p>
      </div>
    `),
  });
}
