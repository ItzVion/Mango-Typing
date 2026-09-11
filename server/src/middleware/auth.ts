import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/db";
import { AUTH_COOKIE_NAME } from "../lib/authCookie";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface AuthRequest extends Request {
  userId?: string;
}

type TokenPayload = { id: string; username?: string; sv?: number };

function extractToken(req: Request): string | null {
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.[AUTH_COOKIE_NAME];
  return cookieToken || null;
}

async function sessionStillValid(payload: TokenPayload): Promise<boolean> {
  // Tokens without a session version are legacy tokens. Reject them instead
  // of allowing an old token to remain valid after the auth format changed.
  if (typeof payload.sv !== "number" || !Number.isInteger(payload.sv) || payload.sv < 0) return false;
  const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { sessionVersion: true } });
  return !!user && user.sessionVersion === payload.sv;
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as TokenPayload;
      if (await sessionStillValid(payload)) req.userId = payload.id;
    } catch {
      // Invalid, expired, or legacy token -> treat as guest.
    }
  }
  next();
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as TokenPayload;
    if (!(await sessionStillValid(payload))) return res.status(401).json({ error: "Invalid or expired token" });
    req.userId = payload.id;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function requireOwner(req: AuthRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as TokenPayload;
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  if (!(await sessionStillValid(payload))) return res.status(401).json({ error: "Invalid or expired token" });
  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user) return res.status(401).json({ error: "Invalid or expired token" });
  req.userId = payload.id;
  if (user.role !== "OWNER") return res.status(403).json({ error: "Owner only" });
  next();
}
