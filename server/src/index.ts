import "dotenv/config";
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

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
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

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`VC TYPING server running on http://localhost:${PORT}`));
}

export default app;
