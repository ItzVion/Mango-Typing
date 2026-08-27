import { Router, Request, Response } from "express";
import { DEFAULT_LEGAL } from "./admin";
import { prisma } from "../lib/db";

const router = Router();

// Public, unauthenticated — used by the Privacy/Refund/Terms pages.
router.get("/:slug", async (req: Request, res: Response): Promise<any> => {
  const slug = req.params.slug;
  if (!DEFAULT_LEGAL[slug]) return res.status(404).json({ error: "Unknown page" });
  const row = await prisma.legalPage.findUnique({ where: { slug } });
  res.json({ slug, content: row?.content ?? DEFAULT_LEGAL[slug] });
});

export default router;
