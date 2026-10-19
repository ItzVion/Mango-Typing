# MangoTyping

MangoTyping is a free typing-practice website with timed tests, printable sheets, typing games, a tutor, account history, and optional donations.

## Architecture

- **Client:** React, TypeScript, Vite, Tailwind CSS and React Router in `client/`.
- **API:** Express and TypeScript in `server/`, exposed to Vercel through `api/index.ts`.
- **Database:** PostgreSQL on Neon, accessed with Prisma.
- **Production web app:** `https://mangotyping.fun`.

## Local development

Use Node.js 22 or 24.

```bash
npm ci --prefix server --legacy-peer-deps
npm ci --prefix client
cd server && npx prisma generate
```

Create local environment files from `server/.env.example` and `client/.env.example`. Never commit real credentials. The API needs `DATABASE_URL`, `JWT_SECRET`, and a 32-byte `SETTINGS_ENCRYPTION_KEY`; email and Google sign-in require their respective provider settings.

Run the API and web app in separate terminals:

```bash
npm run dev --prefix server
npm run dev --prefix client
```

## Build verification

```bash
npm run build --prefix server
npm run build --prefix client
```

Vercel should run both commands so that server TypeScript is checked as well as the client. The repository currently has no unit-test runner; a successful build is not proof that payment, mail, authentication, or account-deletion flows passed runtime tests.

## Database and seed safety

Prisma's schema is in `server/prisma/schema.prisma`. Review schema changes and take a Neon recovery point before applying them to production.

`npm run seed --prefix server` updates or creates the known typing sheets without deleting saved typing tests or existing sheet rows. Never reset the production branch or run destructive SQL for routine maintenance.

## Security notes

- Keep production secrets in Vercel's encrypted environment variables.
- Preview deployments must not share the production database URL.
- Account mutations require same-origin and CSRF checks; keep both enabled.
- Test payment verification and webhook behavior with Razorpay test credentials before changing live-payment settings.
- Report suspected vulnerabilities privately using `SECURITY.md`.
