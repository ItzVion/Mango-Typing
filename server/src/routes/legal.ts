import { Router, Request, Response } from "express";
import { DEFAULT_LEGAL } from "./admin";
import { prisma } from "../lib/db";

const router = Router();
const cache = new Map<string, { content: string; version: string | null; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

router.get("/:slug", async (req: Request, res: Response): Promise<any> => {
  const slug = req.params.slug;
  if (!DEFAULT_LEGAL[slug]) return res.status(404).json({ error: "Unknown page" });

  const now = Date.now();
  const hit = cache.get(slug);
  if (hit && hit.expiresAt > now) {
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=120");
    return res.json({ slug, content: hit.content, version: hit.version });
  }

  const row = await prisma.legalPage.findUnique({ where: { slug } });
  const content = row?.content ?? DEFAULT_LEGAL[slug];
  const version = row?.version ?? null;
  cache.set(slug, { content, version, expiresAt: now + CACHE_TTL_MS });
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=120");
  res.json({ slug, content, version });
});

export default router;
