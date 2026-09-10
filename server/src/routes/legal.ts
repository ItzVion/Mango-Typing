import { Router, Request, Response } from "express";
import { DEFAULT_LEGAL, getCurrentLegalVersion } from "../lib/legal";
import { prisma } from "../lib/db";

const router = Router();
const cache = new Map<string, { content: string; version: string; expiresAt: number }>();
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

  const [row, version] = await Promise.all([
    prisma.legalPage.findUnique({ where: { slug }, select: { content: true } }),
    getCurrentLegalVersion(),
  ]);
  const content = row?.content ?? DEFAULT_LEGAL[slug];
  cache.set(slug, { content, version, expiresAt: now + CACHE_TTL_MS });
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=120");
  res.json({ slug, content, version });
});

export default router;
