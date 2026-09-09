# MangoTyping

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
- DB: SQLite locally (server/prisma/dev.db). Production uses Turso/libSQL.
- Logged-in test scores are saved to the account (userId) and shown on /dashboard. Guest tests are not saved to any account.
- Google OAuth: implemented through Google Identity Services with server-side ID-token verification.
