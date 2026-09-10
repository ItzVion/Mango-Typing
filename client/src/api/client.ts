const BASE = `${window.location.origin}/api`;

const CSRF_COOKIE_NAME = "mt_csrf";
const SETTINGS_CACHE_TTL_MS = 30_000;
let publicSettingsCache: { value: any; expiresAt: number } | null = null;
let publicSettingsRequest: Promise<any> | null = null;

function getCookie(name: string): string | null {
  const prefix = `${encodeURIComponent(name)}=`;
  const entry = document.cookie.split(";").map((v) => v.trim()).find((v) => v.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
}

export function getCsrfToken(): string | null {
  return getCookie(CSRF_COOKIE_NAME);
}

async function request(path: string, opts: RequestInit = {}) {
  const method = String(opts.method || "GET").toUpperCase();
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  const headers = new Headers(opts.headers || {});

  if (opts.body && !(opts.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  if (isMutation && !getCsrfToken()) {
    // A user can click a mutation before the first background GET finishes.
    // The health request is cheap and causes the server to mint the CSRF
    // cookie, after which the real mutation can proceed normally.
    await fetch(`${BASE}/health`, { credentials: "include", cache: "no-store" });
  }
  if (isMutation) {
    const csrf = getCsrfToken();
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  const res = await fetch(`${BASE}${path}`, { ...opts, method, credentials: "include", headers });
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
    const err: any = new Error(data.error || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

async function publicSettings() {
  const now = Date.now();
  if (publicSettingsCache && publicSettingsCache.expiresAt > now) return publicSettingsCache.value;
  if (publicSettingsRequest) return publicSettingsRequest;
  publicSettingsRequest = request("/settings/public")
    .then((value) => {
      publicSettingsCache = { value, expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS };
      return value;
    })
    .finally(() => { publicSettingsRequest = null; });
  return publicSettingsRequest;
}

async function legalPayload(payload: Record<string, unknown>) {
  if (payload.legalVersion) return payload;
  const settings = await publicSettings();
  return { ...payload, legalVersion: settings.legalVersion };
}

export const api = {
  register: async (username: string, email: string, password: string, legalVersion?: string) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(await legalPayload({ username, email, password, ...(legalVersion ? { legalVersion } : {}) })) }),
  verifyOtp: (email: string, token: string) => request("/auth/verify-otp", { method: "POST", body: JSON.stringify({ email, token }) }),
  resendOtp: (email: string) => request("/auth/resend-otp", { method: "POST", body: JSON.stringify({ email }) }),
  login: async (identifier: string, password: string, legalVersion?: string) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(await legalPayload({ identifier, password, ...(legalVersion ? { legalVersion } : {}) })) }),
  googleLogin: async (credential: string, legalVersion?: string) =>
    request("/auth/google", { method: "POST", body: JSON.stringify(await legalPayload({ credential, ...(legalVersion ? { legalVersion } : {}) })) }),
  googleComplete: async (credential: string, username: string, password: string, legalVersion?: string) =>
    request("/auth/google/complete", { method: "POST", body: JSON.stringify(await legalPayload({ credential, username, password, ...(legalVersion ? { legalVersion } : {}) })) }),
  logout: () => request("/auth/logout", { method: "POST" }),

  me: () => request("/auth/me"),
  sheets: () => request("/sheets"),
  sheet: (id: number) => request(`/sheets/${id}`),
  submitTest: (payload: unknown) => request("/tests", { method: "POST", body: JSON.stringify(payload) }),
  myTests: () => request("/tests/me"),
  publicSettings,
  ownerSettings: () => request("/settings"),
  updateSettings: (payload: unknown) => request("/settings", { method: "PATCH", body: JSON.stringify(payload) }),
  testSmtp: (to?: string) => request("/settings/smtp-test", { method: "POST", body: JSON.stringify(to ? { to } : {}) }),
  createDonationOrder: (amountRupees: number) => request("/donations/create-order", { method: "POST", body: JSON.stringify({ amountRupees }) }),
  verifyDonation: (payload: unknown) => request("/donations/verify", { method: "POST", body: JSON.stringify(payload) }),
  myDonations: () => request("/donations/me"),
  legalPage: (slug: string) => request(`/legal/${slug}`),
  adminUsers: () => request("/admin/users"),
  adminCreateUser: (payload: { email: string; username: string; password: string }) => request("/admin/users", { method: "POST", body: JSON.stringify(payload) }),
  adminDeleteUser: (id: string) => request(`/admin/users/${id}`, { method: "DELETE" }),
  adminDonations: () => request("/admin/donations"),
  adminLegalPage: (slug: string) => request(`/admin/legal/${slug}`),
  adminUpdateLegalPage: (slug: string, content: string) => request(`/admin/legal/${slug}`, { method: "PUT", body: JSON.stringify({ content }) }),
  changeUsername: (newUsername: string, password: string) => request("/account/username", { method: "PATCH", body: JSON.stringify({ newUsername, password }) }),
  uploadAvatar: async (file: Blob) => {
    const headers = new Headers();
    if (!getCsrfToken()) await fetch(`${BASE}/health`, { credentials: "include", cache: "no-store" });
    const csrf = getCsrfToken();
    if (csrf) headers.set("X-CSRF-Token", csrf);
    const form = new FormData();
    form.append("avatar", file, "avatar.jpg");
    const res = await fetch(`${BASE}/account/avatar`, { method: "POST", credentials: "include", headers, body: form });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || "Upload failed.");
    return data as { avatarUrl: string };
  },
  removeAvatar: () => request("/account/avatar", { method: "DELETE" }),
  changePassword: (oldPassword: string, newPassword: string, confirmNewPassword: string) => request("/account/password", { method: "PATCH", body: JSON.stringify({ oldPassword, newPassword, confirmNewPassword }) }),
  requestEmailChange: (password: string) => request("/account/email/request", { method: "POST", body: JSON.stringify({ password }) }),
  verifyEmailChangeOld: (code: string, newEmail: string) => request("/account/email/verify-old", { method: "POST", body: JSON.stringify({ code, newEmail }) }),
  verifyEmailChangeNew: (code: string) => request("/account/email/verify-new", { method: "POST", body: JSON.stringify({ code }) }),
  requestAccountDeletion: (password: string) => request("/account/delete/request", { method: "POST", body: JSON.stringify({ password }) }),
  confirmAccountDeletion: (code: string) => request("/account/delete/confirm", { method: "POST", body: JSON.stringify({ code }) }),
};
