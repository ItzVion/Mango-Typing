/**
 * Razorpay sends signed server-to-server notifications, not browser requests.
 * Only this exact POST path may bypass browser Origin/CSRF checks; the webhook
 * handler must still verify X-Razorpay-Signature before processing any event.
 */
export function isRazorpayWebhookRequest(method: string, path: string): boolean {
  return method.toUpperCase() === "POST" && path === "/api/donations/webhook";
}
