# VC TYPING

## Run locally (laptop first, always)

### 1. Server
cd server
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev
# -> http://localhost:5000

### 2. Client (new terminal)
cd client
npm install
npm run dev
# -> http://localhost:5173

## Notes
- DB: SQLite locally (server/prisma/dev.db). Switch to postgresql in schema.prisma + DATABASE_URL when moving to VPS.
- Logged-in test scores are saved to the account (userId) and shown on /dashboard. Guest tests are not saved to any account.
- Google OAuth: not wired yet (manual email/password auth works now). Add passport-google-oauth20 strategy in server/src/routes/auth.ts when you have GOOGLE_CLIENT_ID/SECRET.
- Deploy to VPS only after this runs clean locally: build both, use PM2 for server, Nginx reverse proxy + SSL, switch DB to Postgres.
