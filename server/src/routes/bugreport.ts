import { Router, Request, Response } from "express";
import multer from "multer";
import { optionalAuth, AuthRequest } from "../middleware/auth";
import { checkRateLimit, clientIp } from "../lib/rateLimit";
import { sniffImageMime } from "../lib/imageSniff";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024, files: 5 }, // 1MB per file, max 5 files
  fileFilter: (_req, file, cb) => {
    // This only checks the client-sent Content-Type header for the part —
    // trivially spoofable. Real content is sniffed by magic bytes below,
    // after upload, since multer doesn't expose the buffer at this point.
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  },
});

function safeFilename(mime: string, i: number): string {
  const ext = mime === "image/png" ? "png" : mime === "image/gif" ? "gif" : mime === "image/webp" ? "webp" : "jpg";
  // Never trust the client's originalname as a filename — it can contain
  // path separators or arbitrary characters. Generate our own.
  return `screenshot-${Date.now()}-${i}.${ext}`;
}

const WEBHOOK_URL = process.env.DISCORD_BUG_WEBHOOK;

router.post(
  "/",
  optionalAuth,
  upload.array("screenshots", 5),
  async (req: AuthRequest, res: Response): Promise<any> => {
    if (!WEBHOOK_URL) {
      console.error("DISCORD_BUG_WEBHOOK is not set");
      return res.status(500).json({ error: "Bug reporting is not configured." });
    }

    // Rate limit per-IP: this endpoint fans out to a Discord webhook and
    // accepts file uploads from anyone, guest or not — an easy spam target
    // without a limit.
    const ip = clientIp(req);
    const limit = await checkRateLimit(`bugreport:ip:${ip}`, 5, 10 * 60 * 1000);
    if (!limit.ok) return res.status(429).json({ error: "Too many reports. Please try again later." });

    const { description, page } = req.body;
    if (!description || typeof description !== "string" || description.trim().length < 5) {
      return res.status(400).json({ error: "Please describe the bug (at least 5 characters)." });
    }

    const files = (req.files as Express.Multer.File[]) || [];

    // Verify every file's real content before forwarding anything.
    for (const file of files) {
      if (!sniffImageMime(file.buffer)) {
        return res.status(400).json({ error: "One of the attached files isn't a valid image." });
      }
    }

    try {
      const form = new FormData();
      const payload = {
        embeds: [
          {
            title: "New Bug Report",
            color: 0xf5a623,
            fields: [
              { name: "Description", value: description.slice(0, 1000) },
              { name: "Page", value: page ? String(page).slice(0, 200) : "unknown", inline: true },
              { name: "Reported by", value: req.userId ? `User ID: ${req.userId}` : "Guest", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      };
      form.append("payload_json", JSON.stringify(payload));
      files.forEach((file, i) => {
        const mime = sniffImageMime(file.buffer) || file.mimetype;
        form.append(`files[${i}]`, new Blob([new Uint8Array(file.buffer)], { type: mime }), safeFilename(mime, i));
      });

      const discordRes = await fetch(WEBHOOK_URL, { method: "POST", body: form });
      if (!discordRes.ok) {
        const text = await discordRes.text();
        console.error("Discord webhook error:", discordRes.status, text);
        return res.status(502).json({ error: "Failed to send report. Try again later." });
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Bug report error:", err.message);
      res.status(500).json({ error: "Failed to send report." });
    }
  }
);

export default router;
