export interface ExpectedRazorpayPayment {
  paymentId: string;
  orderId: string;
  amountPaise: number;
}

/** Validate the authoritative payment object returned by Razorpay or its signed webhook. */
export function isValidCapturedPayment(value: unknown, expected: ExpectedRazorpayPayment): boolean {
  if (!value || typeof value !== "object") return false;
  const payment = value as Record<string, unknown>;
  return payment.id === expected.paymentId &&
    payment.order_id === expected.orderId &&
    payment.amount === expected.amountPaise &&
    payment.currency === "INR" &&
    payment.status === "captured" &&
    payment.captured === true;
}
