import "dotenv/config";
import "express-async-errors";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import sheetsRoutes from "./routes/sheets";
import testsRoutes from "./routes/tests";
import settingsRoutes from "./routes/settings";
import donationsRoutes from "./routes/donations";
import adminRoutes from "./routes/admin";
import legalRoutes from "./routes/legal";
import accountRoutes from "./routes/account";
import bugReportRoutes from "./routes/bugreport";

const app = express();
const PORT = process.env.PORT || 5000;

const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  /\.vercel\.app$/,
].filter(Boolean) as (string | RegExp)[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const ok = ALLOWED_ORIGINS.some((o) => (o instanceof RegExp ? o.test(origin) : o === origin));
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
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return;
  res.status(err?.status || 500).json({ error: err?.message || "Internal server error" });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`VC TYPING server running on http://localhost:${PORT}`));
}

export default app;
