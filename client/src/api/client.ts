// Relative path — works in dev, preview, and production without editing
// this file again. On Vercel, vercel.json rewrites /api/(.*) to the
// api/index.ts serverless function; locally, Vite's dev server proxy (or a
// same-origin dev server) handles it the same way.
const BASE = `${window.location.origin}/api`;

// VC-cookie-migration: session auth is the httpOnly vc_auth cookie only —
// no token is ever read from or written to localStorage/JS-visible storage.
// `credentials: "include"` makes sure the cookie is sent even though the
// default fetch credentials mode ("same-origin") would already cover this
// same-origin deployment; being explicit avoids silently breaking auth if
// the API is ever moved to a different subdomain.
async function request(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    if (res.ok) throw new Error("Unexpected response from server.");
    const err: any = new Error(`Server error (${res.status}). Please try again.`);
    err.status = res.status;
    throw err;
  }
  if (!res.ok) {
    // A 401 means the cookie session is invalid/expired/missing. Nothing to
    // clear client-side — the server already didn't set a valid cookie.
    // Callers can inspect `err.status` to tell this apart from a
    // network/server error (see App.tsx's session restore).
    const err: any = new Error(data.error || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  register: (username: string, email: string, password: string) =>
    request("/auth/register", { method: "POST", body: JSON.stringify({ username, email, password }) }),
  verifyOtp: (email: string, token: string) =>
    request("/auth/verify-otp", { method: "POST", body: JSON.stringify({ email, token }) }),
  resendOtp: (email: string) => request("/auth/resend-otp", { method: "POST", body: JSON.stringify({ email }) }),
  login: (identifier: string, password: string) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ identifier, password }) }),
  googleLogin: (credential: string) =>
    request("/auth/google", { method: "POST", body: JSON.stringify({ credential }) }),
  googleComplete: (credential: string, username: string, password: string) =>
    request("/auth/google/complete", { method: "POST", body: JSON.stringify({ credential, username, password }) }),


  me: () => request("/auth/me"),
  sheets: () => request("/sheets"),
  sheet: (id: number) => request(`/sheets/${id}`),
  submitTest: (payload: unknown) => request("/tests", { method: "POST", body: JSON.stringify(payload) }),
  myTests: () => request("/tests/me"),
  publicSettings: () => request("/settings/public"),
  ownerSettings: () => request("/settings"),
  updateSettings: (payload: unknown) => request("/settings", { method: "PATCH", body: JSON.stringify(payload) }),
  testSmtp: (to?: string) => request("/settings/smtp-test", { method: "POST", body: JSON.stringify(to ? { to } : {}) }),
  createDonationOrder: (amountRupees: number) =>
    request("/donations/create-order", { method: "POST", body: JSON.stringify({ amountRupees }) }),
  verifyDonation: (payload: unknown) => request("/donations/verify", { method: "POST", body: JSON.stringify(payload) }),
  myDonations: () => request("/donations/me"),
  legalPage: (slug: string) => request(`/legal/${slug}`),
  adminUsers: () => request("/admin/users"),
  adminCreateUser: (payload: { email: string; username: string; password: string }) =>
    request("/admin/users", { method: "POST", body: JSON.stringify(payload) }),
  adminDeleteUser: (id: string) => request(`/admin/users/${id}`, { method: "DELETE" }),
  adminDonations: () => request("/admin/donations"),
  adminLegalPage: (slug: string) => request(`/admin/legal/${slug}`),
  adminUpdateLegalPage: (slug: string, content: string) =>
    request(`/admin/legal/${slug}`, { method: "PUT", body: JSON.stringify({ content }) }),
  changeUsername: (newUsername: string, password: string) =>
    request("/account/username", { method: "PATCH", body: JSON.stringify({ newUsername, password }) }),
  uploadAvatar: async (file: Blob) => {
    const form = new FormData();
    form.append("avatar", file, "avatar.jpg");
    const res = await fetch(`${window.location.origin}/api/account/avatar`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || "Upload failed.");
    return data as { avatarUrl: string };
  },
  removeAvatar: () => request("/account/avatar", { method: "DELETE" }),
  changePassword: (oldPassword: string, newPassword: string, confirmNewPassword: string) =>
    request("/account/password", { method: "PATCH", body: JSON.stringify({ oldPassword, newPassword, confirmNewPassword }) }),
  requestEmailChange: (password: string) =>
    request("/account/email/request", { method: "POST", body: JSON.stringify({ password }) }),
  verifyEmailChangeOld: (code: string, newEmail: string) =>
    request("/account/email/verify-old", { method: "POST", body: JSON.stringify({ code, newEmail }) }),
  verifyEmailChangeNew: (code: string) =>
    request("/account/email/verify-new", { method: "POST", body: JSON.stringify({ code }) }),
  requestAccountDeletion: (password: string) =>
    request("/account/delete/request", { method: "POST", body: JSON.stringify({ password }) }),
  confirmAccountDeletion: (code: string) =>
    request("/account/delete/confirm", { method: "POST", body: JSON.stringify({ code }) }),
};
