import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const router = Router();
const prisma = new PrismaClient();

const DIFFICULTY_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

router.get("/", async (_req: Request, res: Response) => {
  const sheets = await prisma.sheet.findMany({
    orderBy: { id: "asc" },
    select: { id: true, title: true, topic: true, wordCount: true, charCount: true, difficulty: true },
  });
  sheets.sort((a, b) => (DIFFICULTY_ORDER[a.difficulty] ?? 99) - (DIFFICULTY_ORDER[b.difficulty] ?? 99) || a.id - b.id);
  res.json(sheets);
});

router.get("/:id", async (req: Request, res: Response): Promise<any> => {
  const sheet = await prisma.sheet.findUnique({ where: { id: Number(req.params.id) } });
  if (!sheet) return res.status(404).json({ error: "Sheet not found" });
  res.json(sheet);
});

export default router;
