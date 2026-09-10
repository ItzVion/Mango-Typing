import "dotenv/config";
import "express-async-errors";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { validateConfig } from "./lib/validateConfig";
import { ensureDbSchema } from "./lib/ensureDbSchema";
import { ensureCsrfCookie, requireCsrf } from "./lib/csrf";
import { prisma } from "./lib/db";
import authRoutes from "./routes/auth";
import sheetsRoutes from "./routes/sheets";
import testsRoutes from "./routes/tests";
import settingsRoutes from "./routes/settings";
import donationsRoutes from "./routes/donations";
import adminRoutes from "./routes/admin";
import legalRoutes from "./routes/legal";
import accountRoutes from "./routes/account";
import bugReportRoutes from "./routes/bugreport";

validateConfig();
const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=*");
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  next();
});
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;
const ALLOWED_ORIGINS = [process.env.CLIENT_URL, "http://localhost:5173", ...(process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? [])].filter(Boolean) as string[];
app.use(cors({ origin: (origin, callback) => { if (!origin) return callback(null, true); callback(null, ALLOWED_ORIGINS.includes(origin)); }, credentials: true }));
app.use("/api/donations/webhook", express.raw({ type: "application/json", limit: "64kb" }));
app.use(express.json({ limit: "32kb", strict: true }));
app.use(cookieParser());
app.use(ensureCsrfCookie);

app.get("/api/health", async (_req, res) => {
  const checks: Record<string, boolean> = { schema: false, rawQuery: false, settings: false, legal: false };
  try {
    await ensureDbSchema();
    checks.schema = true;
    await prisma.$queryRaw`SELECT 1`;
    checks.rawQuery = true;
    await prisma.settings.findUnique({ where: { id: 1 } });
    checks.settings = true;
    await prisma.legalPage.findUnique({ where: { slug: "terms" } });
    checks.legal = true;
  } catch (error) {
    console.error("Database health check failed:", error);
  }
  const ok = Object.values(checks).every(Boolean);
  res.status(ok ? 200 : 503).json({ ok, checks });
});

// Ensure a Turso database that was provisioned without the latest migrations
// is usable before any other Prisma-backed route executes. The operation is
// idempotent and cached for the lifetime of a warm serverless instance.
app.use(async (_req, _res, next) => {
  try {
    await ensureDbSchema();
    next();
  } catch (error) {
    next(error);
  }
});

function requireSafeOrigin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  const originHeader = req.headers.origin || req.headers.referer;
  if (!originHeader) return res.status(403).json({ error: "Cross-site request blocked." });
  let originValue: string; try { originValue = new URL(originHeader).origin; } catch { return res.status(403).json({ error: "Cross-site request blocked." }); }
  const requestHost = req.headers.host;
  if (requestHost && new URL(originHeader).host === requestHost) return next();
  if (ALLOWED_ORIGINS.includes(originValue)) return next();
  return res.status(403).json({ error: "Cross-site request blocked." });
}
app.use(requireSafeOrigin);
app.use(requireCsrf);
app.use("/api/auth", authRoutes);
app.use("/api/sheets", sheetsRoutes);
app.use("/api/tests", testsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/donations", donationsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/legal", legalRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/bugreport", bugReportRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => { console.error("Unhandled request error:", err?.message || err); if (res.headersSent) return next(err); const status = Number.isInteger(err?.statusCode) ? err.statusCode : 500; res.status(status).json({ error: status >= 500 ? "Internal server error" : String(err?.message || "Request failed") }); });

// Vercel imports this Express application as the serverless handler.
// Keep the local Node entrypoint for normal development/production servers.
export default app;
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}
