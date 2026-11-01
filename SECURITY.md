# MangoTyping Security

## Reporting a security issue

Please report suspected vulnerabilities privately to the MangoTyping support/security contact at `support@mangotyping.fun`. Do not publicly disclose credentials, tokens, payment secrets, personal data, or an exploitable proof of concept before the issue has been contained.

When possible, include the affected URL or endpoint, approximate time, reproduction steps, impact, and relevant request/response details with secrets and personal data redacted.

## Incident response

1. **Contain:** disable or isolate the affected feature, revoke compromised credentials/tokens, and enable maintenance mode if necessary.
2. **Preserve evidence:** retain relevant application, authentication, payment, and security logs without unnecessarily exposing personal data.
3. **Assess:** determine affected systems, users, data categories, timeline, and whether processors or third parties are involved.
4. **Notify:** where applicable, notify CERT-In in accordance with its incident-reporting directions (including the six-hour reporting requirement for covered incidents) and follow the applicable personal-data-breach notification requirements.
5. **DPDP response:** for a personal data breach, prepare affected-user communication and the information required by the applicable law. The DPDP Act's main processing obligations (including the child-data provisions) and the relevant 2025 Rules are scheduled to commence on 13 May 2027 under the phased commencement notification. Once in force, the Rules prescribe notice to affected Data Principals without delay and detailed information to the Data Protection Board within 72 hours, unless the Board allows a longer period. Until then, follow the obligations currently in force and any applicable CERT-In or contractual duties.
6. **Remediate:** patch the root cause, rotate affected secrets, invalidate compromised sessions, and verify recovery.
7. **Review:** record the incident, corrective actions, and lessons learned in the audit trail and update controls where appropriate.

## Data-protection controls

MangoTyping uses secure HTTP-only authentication cookies, CSRF protection for state-changing requests, rate limiting, strict origin/security-header controls, password hashing, encrypted secret storage, authorization checks, privacy export/request endpoints, audit logging, and idempotent Razorpay webhook handling.

## Child safety and privacy

MangoTyping does not intentionally use targeted advertising or behavioural profiling directed at children. Before processing child personal data under applicable DPDP requirements, MangoTyping must use an appropriate verifiable parental-consent process. The notified DPDP Rules 2025 describe verification using reliable identity/age details or an authorised virtual-token/Digital Locker route. Until a production-ready verification integration is available, the product must not represent a simple checkbox or an ordinary email reply as legally verified parental consent.

## Production checklist

- Keep production secrets only in the deployment secret store.
- Use live Razorpay credentials only when the donation system is actually ready for real payments.
- Keep legal/privacy content versioned and require current legal acceptance where applicable.
- Review third-party processors, international processing, retention, and contractual safeguards before launch.
- Test account recovery, logout/session invalidation, privacy requests, payment webhooks, and breach-response procedures after material changes.

## Database hardening status

- Row-level security is enabled on all 13 production public tables.
- Vercel production now uses the dedicated `mangotyping_app` login role. It is `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOBYPASSRLS`, and `NOINHERIT`, with a 10-connection limit. It has DML privileges only; the table-owning `neondb_owner` role is reserved for migrations and database administration.
- RLS policies exist for the application role, but they are currently service-level policies that allow the application role to access all rows. They are **not** per-user row isolation. Application authorization and ownership filters remain mandatory.
- Do not enable FORCE ROW LEVEL SECURITY or replace the service policies with user policies until Prisma request scoping is securely implemented and all routes, auth flows, background jobs, public pages, and admin operations have been tested.
- Production startup verifies the schema only. Schema changes must be applied as reviewed migrations, not from HTTP requests or serverless cold starts.

## Backup and recovery

The current Neon Free plan has a six-hour restore-history window and no scheduled snapshot schedule configured. A manual snapshot has a storage charge. Keep an independent export of critical data and test restoration before relying on a backup. Do not describe the database as having a 180-day backup.

## Log retention

Security/audit records are useful evidence but are not a substitute for the complete system logs that may be required by applicable CERT-In directions. Confirm the actual retention and location of Vercel, Neon, and email/payment-provider logs. For covered incidents, follow the applicable reporting timeline and preserve relevant evidence.
