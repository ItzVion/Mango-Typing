import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { isBlockedSmtpAddress, normalizeSmtpHostname } from "../src/lib/smtpSecurity";
import { isValidCapturedPayment } from "../src/lib/paymentValidation";
import { hashCode, codesMatch } from "../src/lib/otp";

test("SMTP destination screening rejects private and special IPv4 ranges", () => {
  for (const ip of [
    "127.0.0.1", "10.0.0.8", "172.16.0.1", "192.168.1.4",
    "169.254.169.254", "100.64.0.1", "198.18.0.1", "224.0.0.1",
    "192.88.99.1", "198.51.100.7", "203.0.113.7", "240.0.0.1",
  ]) assert.equal(isBlockedSmtpAddress(ip), true, ip);
  assert.equal(isBlockedSmtpAddress("8.8.8.8"), false);
});

test("SMTP destination screening rejects non-global IPv6 and accepts public global unicast", () => {
  for (const ip of ["::1", "::", "fc00::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "2001:db8::1"]) {
    assert.equal(isBlockedSmtpAddress(ip), true, ip);
  }
  assert.equal(isBlockedSmtpAddress("2001:4860:4860::8888"), false);
});

test("SMTP host validation permits DNS hostnames and rejects local/IP literals", () => {
  assert.equal(normalizeSmtpHostname("SMTP.ZOHO.IN."), "smtp.zoho.in");
  for (const host of ["localhost", "127.0.0.1", "192.168.1.1", "smtp internal", "http://smtp.example.com", "a".repeat(254)]) {
    assert.throws(() => normalizeSmtpHostname(host), undefined, host);
  }
});

test("Razorpay payment must be captured, INR, and match exact order/id/amount", () => {
  const valid = {
    id: "pay_Abc123",
    order_id: "order_XyZ789",
    amount: 5000,
    currency: "INR",
    status: "captured",
    captured: true,
  };
  const expected = { paymentId: valid.id, orderId: valid.order_id, amountPaise: valid.amount };
  assert.equal(isValidCapturedPayment(valid, expected), true);
  assert.equal(isValidCapturedPayment({ ...valid, order_id: "order_other" }, expected), false);
  assert.equal(isValidCapturedPayment({ ...valid, amount: 1 }, expected), false);
  assert.equal(isValidCapturedPayment({ ...valid, status: "authorized", captured: false }, expected), false);
  assert.equal(isValidCapturedPayment({ ...valid, currency: "USD" }, expected), false);
  assert.equal(isValidCapturedPayment(null, expected), false);
});

test("OTP hashes are keyed and existing SHA-256 codes remain valid during rollout", () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-only-otp-hmac-secret";
  try {
    const currentHash = hashCode("123456");
    assert.match(currentHash, /^hmac1:[a-f0-9]{64}$/);
    assert.equal(codesMatch("123456", currentHash), true);
    assert.equal(codesMatch("123457", currentHash), false);

    const legacyHash = crypto.createHash("sha256").update("654321").digest("hex");
    assert.equal(codesMatch("654321", legacyHash), true);
    assert.equal(codesMatch("654322", legacyHash), false);
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
