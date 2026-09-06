import { Response } from "express";

// Defense-in-depth alongside the existing Bearer-token flow: the JWT is
// stored client-side (authStore/localStorage) today, which is readable by
// any script that runs on the page — a single XSS bug anywhere in the app
// (or a compromised third-party script) can walk out with the token. An
// httpOnly cookie can't be read by JS at all, so this mirrors every token
// issue into one as well. Nothing about the existing header-based flow is
// removed — requireAuth/optionalAuth accept either, so no client changes
// are required for this to take effect.
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
