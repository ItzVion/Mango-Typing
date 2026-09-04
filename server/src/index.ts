import "dotenv/config";
import "express-async-errors";
import express from "express";
import cors from "cors";
import { validateConfig } from "./lib/validateConfig";
import authRoutes from "./routes/auth";
import sheetsRoutes from "./routes/sheets";
import testsRoutes from "./routes/tests";
import settingsRoutes from "./routes/settings";
import donationsRoutes from "./routes/donations";
import adminRoutes from "./routes/admin";
import legalRoutes from "./routes/legal";
import accountRoutes from "./routes/account";
import bugReportRoutes from "./routes/bugreport";

// Fails fast (loudly, in the function logs) if a required secret is missing
// in production/Vercel, instead of quietly running with an insecure default.
validateConfig();

const app = express();
// Vercel's edge network sits in front of every request and sets
// x-forwarded-for itself — trusting the first hop is correct here (this
// isn't an arbitrary/unknown reverse-proxy chain). This also makes req.ip
// accurate for any future code that reads it directly, though the rate
// limiter below uses its own x-forwarded-for read regardless.
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;

// No blanket *.vercel.app trust: that pattern matches ANY Vercel project on
// the internet, not just your own preview deployments — any other Vercel
// app could send credentialed requests here. List explicit origins only;
// add a preview URL via ALLOWED_ORIGINS in Vercel's env vars when needed.
const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  ...(process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? []),
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const ok = ALLOWED_ORIGINS.includes(origin);
    callback(null, ok);
  },
  credentials: true,
}));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/sheets", sheetsRoutes);
app.use("/api/tests", testsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/donations", donationsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/legal", legalRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/bugreport", bugReportRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Unmatched /api/* routes -> JSON 404 instead of falling through to index.html
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

// Catches every thrown/rejected error from the routes above (including
// Prisma/Turso connection failures) and always returns JSON instead of
// letting it become a raw HTML crash page that breaks res.json() on the client.
// Anything that reaches this handler is an unexpected exception — every
// intentional/expected error in this codebase already returns its own
// res.status(...).json(...) directly from within its route, so nothing
// here has a deliberately-set safe message. Never forward err.message to
// the client: on a real bug (a DB error, a null-ref, etc.) that can leak
// internal paths, query fragments, or stack details. Multer's upload
// errors are the one recognized exception — their messages are written to
// be shown to users (e.g. "File too large").
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return;
  if (err?.name === "MulterError") {
    return res.status(400).json({ error: err.message || "Upload failed." });
  }
  res.status(500).json({ error: "Internal server error" });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`VC TYPING server running on http://localhost:${PORT}`));
}

export default app;
