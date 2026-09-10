import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

export const CSRF_COOKIE_NAME = "mt_csrf";

export function ensureCsrfCookie(req: Request, res: Response, next: NextFunction) {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies || {};
  if (!cookies[CSRF_COOKIE_NAME]) {
    res.cookie(CSRF_COOKIE_NAME, crypto.randomBytes(32).toString("base64url"), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production" || !!process.env.VERCEL,
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
  next();
}

export function requireCsrf(req: Request, res: Response, next: NextFunction) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies || {};
  const cookieToken = cookies[CSRF_COOKIE_NAME];
  const headerToken = req.get("X-CSRF-Token");
  if (!cookieToken || !headerToken) return res.status(403).json({ error: "CSRF validation failed." });
  const a = Buffer.from(cookieToken); const b = Buffer.from(headerToken);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(403).json({ error: "CSRF validation failed." });
  next();
}
