import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { optionalAuth, AuthRequest } from "../middleware/auth";
import { checkRateLimit, clientIp } from "../lib/rateLimit";
import { sniffImageMime } from "../lib/imageSniff";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1 * 1024 * 1024,
    files: 5,
    fields: 8,
    fieldSize: 16 * 1024,
    fieldNameSize: 100,
    parts: 13,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Only image files are allowed."));
    cb(null, true);
  },
});

function safeFilename(mime: string, i: number): string {
  const ext = mime === "image/png" ? "png" : mime === "image/gif" ? "gif" : mime === "image/webp" ? "webp" : "jpg";
  return `screenshot-${Date.now()}-${i}.${ext}`;
}

const WEBHOOK_URL = process.env.DISCORD_BUG_WEBHOOK;

async function preUploadRateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = clientIp(req);
  const limit = await checkRateLimit(`bugreport:ip:${ip}`, 5, 10 * 60 * 1000);
  if (!limit.ok) return res.status(429).json({ error: "Too many reports. Please try again later." });
  next();
}

router.post(
  "/",
  preUploadRateLimit,
  optionalAuth,
  upload.array("screenshots", 5),
  async (req: AuthRequest, res: Response): Promise<any> => {
    if (!WEBHOOK_URL) {
      console.error("DISCORD_BUG_WEBHOOK is not set");
      return res.status(500).json({ error: "Bug reporting is not configured." });
    }

    const { description, page } = req.body;
    if (!description || typeof description !== "string" || description.trim().length < 5 || description.trim().length > 1000) {
      return res.status(400).json({ error: "Please describe the bug in 5–1000 characters." });
    }

    const files = (req.files as Express.Multer.File[]) || [];
    for (const file of files) {
      if (!sniffImageMime(file.buffer)) return res.status(400).json({ error: "One of the attached files isn't a valid image." });
    }

    try {
      const form = new FormData();
      const payload = {
        embeds: [{
          title: "New Bug Report",
          color: 0xf5a623,
          fields: [
            { name: "Description", value: description.trim().slice(0, 1000) },
            { name: "Page", value: page ? String(page).slice(0, 200) : "unknown", inline: true },
            { name: "Reported by", value: req.userId ? `User ID: ${req.userId}` : "Guest", inline: true },
          ],
          timestamp: new Date().toISOString(),
        }],
      };
      form.append("payload_json", JSON.stringify(payload));
      files.forEach((file, i) => {
        const mime = sniffImageMime(file.buffer) || file.mimetype;
        form.append(`files[${i}]`, new Blob([new Uint8Array(file.buffer)], { type: mime }), safeFilename(mime, i));
      });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);
      let discordRes: globalThis.Response;
      try {
        discordRes = await fetch(WEBHOOK_URL, { method: "POST", body: form, signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
      if (!discordRes.ok) {
        console.error("Discord webhook error:", discordRes.status);
        return res.status(502).json({ error: "Failed to send report. Try again later." });
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error("Bug report error:", err?.message || err);
      res.status(500).json({ error: "Failed to send report." });
    }
  }
);

export default router;
