import "dotenv/config";
import "express-async-errors";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { validateConfig } from "./lib/validateConfig";
import { ensureDbSchema, ensureSecuritySchema } from "./lib/ensureDbSchema";
import { ensureCsrfCookie, requireCsrf } from "./lib/csrf";
import authRoutes from "./routes/auth";
import sheetsRoutes from "./routes/sheets";
import testsRoutes from "./routes/tests";
import settingsRoutes from "./routes/settings";
import donationsRoutes from "./routes/donations";
import adminRoutes from "./routes/admin";
import legalRoutes from "./routes/legal";
import accountRoutes from "./routes/account";
import bugReportRoutes from "./routes/bugreport";
import privacyRoutes from "./routes/privacy";

validateConfig();
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.set("query parser", "simple");

const PRODUCTION_ORIGINS = [
  process.env.CLIENT_URL,
  "https://mangotyping.fun",
  "https://www.mangotyping.fun",
  ...(process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? []),
].filter(Boolean) as string[];
const LOCAL_ORIGINS = ["http://localhost:5173", "http://localhost:4173"];
const ALLOWED_ORIGINS = process.env.NODE_ENV === "production" || process.env.VERCEL
  ? PRODUCTION_ORIGINS
  : [...PRODUCTION_ORIGINS, ...LOCAL_ORIGINS];

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  if (req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    return callback(null, ALLOWED_ORIGINS.includes(origin));
  },
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-CSRF-Token", "Authorization"],
  maxAge: 86400,
}));

app.use("/api/donations/webhook", express.raw({ type: "application/json", limit: "64kb" }));
app.use(express.json({ limit: "32kb", strict: true }));
app.use(cookieParser());
app.use(ensureCsrfCookie);

if (process.env.VERCEL) {
  app.use(async (_req, _res, next) => {
    try { await ensureSecuritySchema(); next(); } catch (error) { next(error); }
  });
} else {
  app.use(async (_req, _res, next) => {
    try { await ensureDbSchema(); next(); } catch (error) { next(error); }
  });
}

function requireSafeOrigin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (!MUTATING_METHODS.has(req.method)) return next();

  const originHeader = req.headers.origin || req.headers.referer;
  if (!originHeader) return res.status(403).json({ error: "Cross-site request blocked." });

  let originValue: string;
  try {
    originValue = new URL(originHeader).origin;
  } catch {
    return res.status(403).json({ error: "Cross-site request blocked." });
  }

  const requestOrigin = `${req.protocol}://${req.get("host")}`;
  if (originValue === requestOrigin || ALLOWED_ORIGINS.includes(originValue)) return next();
  return res.status(403).json({ error: "Cross-site request blocked." });
}

app.use(requireSafeOrigin);
app.use((req, res, next) => {
  if (req.method === "POST" && req.path === "/api/auth/logout") return next();
  return requireCsrf(req, res, next);
});

app.use("/api/auth", authRoutes);
app.use("/api/sheets", sheetsRoutes);
app.use("/api/tests", testsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/donations", donationsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/legal", legalRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/bugreport", bugReportRoutes);
app.use("/api/privacy", privacyRoutes);
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled request error:", err?.message || err);
  if (res.headersSent) return next(err);
  const status = Number.isInteger(err?.statusCode) && err.statusCode >= 400 && err.statusCode < 500 ? err.statusCode : 500;
  res.status(status).json({ error: status >= 500 ? "Internal server error" : String(err?.message || "Request failed") });
});

export default app;
const PORT = Number(process.env.PORT || 5000);
if (!process.env.VERCEL) app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
