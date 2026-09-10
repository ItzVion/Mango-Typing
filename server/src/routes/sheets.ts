import { Router, Request, Response } from "express";
import { prisma } from "../lib/db";

const router = Router();
const DIFFICULTY_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
const CACHE_TTL_MS = 60_000;
let listCache: { value: any[]; expiresAt: number } | null = null;
const sheetCache = new Map<number, { value: any; expiresAt: number }>();

router.get("/", async (_req: Request, res: Response) => {
  const now = Date.now();
  if (listCache && listCache.expiresAt > now) {
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=120");
    return res.json(listCache.value);
  }
  const sheets = await prisma.sheet.findMany({
    orderBy: { id: "asc" },
    select: { id: true, title: true, topic: true, wordCount: true, charCount: true, difficulty: true },
  });
  sheets.sort((a, b) => (DIFFICULTY_ORDER[a.difficulty] ?? 99) - (DIFFICULTY_ORDER[b.difficulty] ?? 99) || a.id - b.id);
  listCache = { value: sheets, expiresAt: now + CACHE_TTL_MS };
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=120");
  res.json(sheets);
});

router.get("/:id", async (req: Request, res: Response): Promise<any> => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: "Invalid sheet id" });
  const now = Date.now();
  const hit = sheetCache.get(id);
  if (hit && hit.expiresAt > now) {
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=120");
    return res.json(hit.value);
  }
  const sheet = await prisma.sheet.findUnique({ where: { id } });
  if (!sheet) return res.status(404).json({ error: "Sheet not found" });
  sheetCache.set(id, { value: sheet, expiresAt: now + CACHE_TTL_MS });
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=120");
  res.json(sheet);
});

export default router;
