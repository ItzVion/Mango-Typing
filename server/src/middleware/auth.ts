import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/db";

// No fallback secret — production must set a real JWT_SECRET (enforced by
// validateConfig.ts at boot). A hardcoded fallback here would mean anyone
// could forge a valid token if the env var was ever missing.
const JWT_SECRET = process.env.JWT_SECRET!;

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

// Site owner is identified by a stable role on the User row, not by email
// (emails can be changed by the account itself via /account/email). Only
// role === "OWNER" may view/edit Razorpay keys, SMTP settings, users, and
// legal pages via /admin.
export async function requireOwner(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Not authenticated" });

  // JWT verification and the DB role lookup are deliberately in separate
  // try/catches. A malformed/expired token is genuinely a 401. A DB/network
  // failure while looking up the current role is NOT an auth failure —
  // returning 401 for it would make the client wipe a perfectly valid token
  // just because the database (Turso) hiccuped.
  let payload: { id: string };
  try {
    payload = jwt.verify(header.slice(7), JWT_SECRET) as { id: string };
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.userId = payload.id;
  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || user.role !== "OWNER") return res.status(403).json({ error: "Owner only" });
  next();
}
