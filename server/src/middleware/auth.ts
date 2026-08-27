import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "vc-typing-secret-key";

export interface AuthRequest extends Request {
  userId?: string;
}

// Attaches userId if a valid token is present, but never blocks the request.
// This lets /api/tests accept both logged-in and guest submissions.
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET) as { id: string };
      req.userId = payload.id;
    } catch {
      // invalid/expired token -> treat as guest
    }
  }
  next();
}

// Blocks the request unless a valid token is present.
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Not authenticated" });
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { id: string; username: string };
    req.userId = payload.id;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Site owner is hardcoded by email — only this account may view/edit
// Razorpay keys and site settings via /payedit. Everyone else gets 403,
// and the frontend redirects anyone else straight back to the homepage.
export const OWNER_EMAIL = "vion4712@gmail.com";

export async function requireOwner(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Not authenticated" });
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { id: string };
    req.userId = payload.id;
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || user.email !== OWNER_EMAIL) return res.status(403).json({ error: "Owner only" });
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
