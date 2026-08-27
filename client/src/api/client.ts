// Relative path — works on localhost, IP, or domain without editing this file again.
// Nginx proxies /api -> localhost:5000
const BASE = `${window.location.origin}/api`;

function getToken() {
  return localStorage.getItem("vc_token");
}

async function request(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    throw new Error(res.ok ? "Unexpected response from server." : `Server error (${res.status}). Please try again.`);
  }
  if (!res.ok) throw new Error(data.error || "Request failed");
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

export const OWNER_EMAIL = "vion4712@gmail.com";
