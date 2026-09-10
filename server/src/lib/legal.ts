import crypto from "crypto";
import { prisma } from "./db";

export const LEGAL_VERSION = "2026-09-10";

export const DEFAULT_LEGAL: Record<string, string> = {
  privacy: `MangoTyping — Privacy Policy
Version: ${LEGAL_VERSION}
Last updated: September 10, 2026

PRIVACY CONTACT
For privacy questions, rights requests, complaints, or security/privacy concerns, contact support@mangotyping.fun. This address is the published business contact for a person able to answer questions about MangoTyping's processing of personal data.

PERSONAL DATA WE MAY COLLECT
1. Account data: username, email address, password hash, profile/avatar information, authentication identifiers and account timestamps.
2. Google sign-in data: Google account identifier, verified email and, where supplied, profile name/image. MangoTyping never receives a Google password.
3. Service data: typing-test results, scores, accuracy, test mode, timing/statistics and related history saved to an account.
4. Payment/donation data: Razorpay order/payment identifiers, amount, status and timestamps. Razorpay handles payment credentials; MangoTyping does not intentionally store full card numbers, CVV/CVC, UPI PINs or bank credentials.
5. Security/support data: IP address or related request information used for rate limiting, abuse prevention and security; information voluntarily submitted in support or bug reports; and security/audit records needed to investigate incidents.
6. Privacy-request data: the type, details and status of requests submitted through MangoTyping's privacy-request mechanism.

WHY WE PROCESS IT
We process data only as reasonably necessary to create and authenticate accounts, provide typing tests/history/games/tutor features, prevent abuse and fraud, maintain service security and reliability, provide support, process and reconcile donations, respond to privacy requests, and comply with applicable law.

THIRD-PARTY PROCESSORS
Depending on the feature used, service providers may include hosting/deployment infrastructure, Turso/libSQL, Google authentication services, Razorpay, email/SMTP providers and other configured support providers. Some providers may process data outside India. MangoTyping should use appropriate contractual and technical safeguards with processors and disclose material processor categories in accordance with applicable law.

CHILDREN
MangoTyping does not use targeted advertising or behavioural profiling directed at children. Where applicable law requires verifiable parental or lawful-guardian consent before processing a child's personal data, MangoTyping will require an appropriate verification process before such processing. A simple checkbox or ordinary email reply is not represented as legally verified parental consent. Users must not provide another person's personal data without the required authority.

RETENTION AND DELETION
We retain personal data only for as long as reasonably necessary for the stated purpose, account operation, security, support, transaction reconciliation, dispute prevention, or a legal obligation. When the purpose no longer requires the data and no legal retention obligation applies, we will delete or de-identify it. Security and processing logs may need to be retained for the periods required by applicable law or security requirements. Payment and accounting records may be retained where required for legal, tax, fraud-prevention, chargeback, or dispute-resolution purposes.

YOUR RIGHTS AND REQUESTS
Where applicable law provides these rights, you may request access to your personal data, correction, erasure, withdrawal of consent, or raise a grievance. Signed-in users can use MangoTyping's privacy-request mechanism or contact support@mangotyping.fun. MangoTyping may need to verify identity before acting on a request and may retain information that the law requires it to retain.

SECURITY
MangoTyping uses reasonable technical and organisational safeguards including secure HTTP-only authentication cookies, CSRF protection, rate limiting, access controls, password hashing, encrypted secret storage, security headers, audit logging and payment-webhook verification. No internet service can guarantee absolute security.

BREACHES
If a personal-data breach occurs, MangoTyping will assess and respond without undue delay and provide notifications required by applicable law. Incident handling also follows the published security response procedure in SECURITY.md.

CHANGES
We may update this policy when the service, law, processors, or processing purposes change. Material changes may require renewed acceptance where applicable. The currently effective legal revision is recorded by MangoTyping and tied to the legal content presented at the time of acceptance.`,
  refund: `MangoTyping — Refund Policy
Version: ${LEGAL_VERSION}
Last updated: September 10, 2026

MangoTyping donations are voluntary contributions supporting hosting, domains, infrastructure and development. They are not purchases of scores, advantages, subscriptions or guaranteed benefits.

Razorpay processes payment credentials. MangoTyping does not intentionally store full card numbers, CVV/CVC, UPI PINs or bank credentials. MangoTyping stores payment/order identifiers, amount, status and timestamps needed for service and reconciliation.

Donations are generally non-refundable, but this does not remove any refund, reversal, chargeback, consumer-protection, payment-network or other right that cannot lawfully be excluded. We may correct duplicate payments, failed-but-charged transactions, unauthorized transactions and technical errors.

For payment problems contact support@mangotyping.fun with the Razorpay order/payment identifier, date and amount. Never send card numbers, CVV/CVC, UPI PINs or passwords. Any applicable refund will be processed through the available payment mechanism within a reasonable processing period, subject to the payment provider and applicable law.`,
  terms: `MangoTyping — Terms of Service
Version: ${LEGAL_VERSION}
Last updated: September 10, 2026

By using MangoTyping or creating an account, you agree to these Terms, the Privacy Policy and the Refund Policy after being given a reasonable opportunity to review them. If applicable law requires a parent or lawful guardian to consent to processing of a child's personal data, that consent requirement is not replaced by these Terms.

MangoTyping provides typing practice, tests, games, tutor content and related features. Scores and outputs may contain errors and may change. Keep account credentials secure and do not misuse the service, attempt unauthorized access, interfere with service operation, upload malicious content, impersonate others, or submit information you do not have the right to provide.

You retain rights in lawful content you submit while granting MangoTyping the limited rights needed to operate the service. Donations are voluntary and governed by the Refund Policy. Third-party services have their own terms and policies.

The service is provided without a guarantee of uninterrupted or error-free operation, to the extent permitted by law. We may suspend or terminate accounts for abuse, fraud, security threats, or violations of these Terms. Nothing in these Terms removes mandatory legal rights or remedies that cannot lawfully be excluded.

For questions, privacy requests, complaints, or support, contact support@mangotyping.fun. Material changes may require renewed acceptance.`,
};

const LEGAL_SLUGS = Object.keys(DEFAULT_LEGAL).sort();
let cachedVersion: { value: string; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function getCurrentLegalVersion(): Promise<string> {
  const now = Date.now();
  if (cachedVersion && cachedVersion.expiresAt > now) return cachedVersion.value;
  const rows = await prisma.legalPage.findMany({ where: { slug: { in: LEGAL_SLUGS } }, select: { slug: true, content: true } });
  const contents = LEGAL_SLUGS.map((slug) => `${slug}\0${rows.find((row) => row.slug === slug)?.content ?? DEFAULT_LEGAL[slug]}`).join("\0");
  const digest = crypto.createHash("sha256").update(contents, "utf8").digest("hex").slice(0, 16);
  const value = `${LEGAL_VERSION}-${digest}`;
  cachedVersion = { value, expiresAt: now + CACHE_TTL_MS };
  return value;
}

export function clearLegalVersionCache() {
  cachedVersion = null;
}
