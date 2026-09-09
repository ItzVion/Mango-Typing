import { Response } from "express";

// Defense-in-depth for MangoTyping session security: the JWT is stored in an
// httpOnly cookie so JavaScript cannot read it. Authentication middleware
// intentionally accepts this cookie only; there is no client-readable token
// or alternate Authorization-header session path.
export const AUTH_COOKIE_NAME = "vc_auth";

export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax", // client + API are same-origin here (vercel.json rewrites /api/* to the same domain)
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // matches the 7d JWT expiry in auth.ts
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
}
