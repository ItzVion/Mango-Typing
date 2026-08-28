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
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { id: string };
    req.userId = payload.id;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Kept only as a one-time migration bootstrap: the account that used to be
// hardcoded as owner-by-email. Authorization itself is role-based (see
// below) so changing this account's email can never revoke its own access —
// that used to be a real lockout bug. Do not add new checks against this.
export const OWNER_EMAIL = "vion4712@gmail.com";

// Site owner is identified by a stable role on the User row, not by email
// (emails can be changed by the account itself via /account/email). Only
// role === "OWNER" may view/edit Razorpay keys, SMTP settings, users, and
// legal pages via /admin.
export async function requireOwner(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Not authenticated" });
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { id: string };
    req.userId = payload.id;
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || user.role !== "OWNER") return res.status(403).json({ error: "Owner only" });
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
