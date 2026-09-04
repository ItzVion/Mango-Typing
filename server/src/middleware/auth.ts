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

type TokenPayload = { id: string; sv?: number };

// Shared check: does this token's embedded session version still match the
// live DB value? A password change bumps User.sessionVersion, which makes
// every token issued before that moment fail this check — without needing
// a separate revocation/blocklist table.
async function sessionStillValid(payload: TokenPayload): Promise<boolean> {
  if (typeof payload.sv !== "number") return true; // tokens issued before this field existed
  const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { sessionVersion: true } });
  return !!user && user.sessionVersion === payload.sv;
}

// Attaches userId if a valid token is present, but never blocks the request.
// This lets /api/tests accept both logged-in and guest submissions.
export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET, { algorithms: ["HS256"] }) as TokenPayload;
      if (await sessionStillValid(payload)) req.userId = payload.id;
    } catch {
      // invalid/expired token -> treat as guest
    }
  }
  next();
}

// Blocks the request unless a valid token is present.
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Not authenticated" });
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET, { algorithms: ["HS256"] }) as TokenPayload;
    if (!(await sessionStillValid(payload))) return res.status(401).json({ error: "Invalid or expired token" });
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
  let payload: TokenPayload;
  try {
    payload = jwt.verify(header.slice(7), JWT_SECRET, { algorithms: ["HS256"] }) as TokenPayload;
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user) return res.status(401).json({ error: "Invalid or expired token" });
  if (typeof payload.sv === "number" && user.sessionVersion !== payload.sv) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  req.userId = payload.id;
  if (user.role !== "OWNER") return res.status(403).json({ error: "Owner only" });
  next();
}
