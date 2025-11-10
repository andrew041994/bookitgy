# Bookit GY

Monorepo with:
- **API**: Node.js + Express + Prisma + Postgres + Redis + WhatsApp Cloud API
- **App**: Expo React Native (also builds to **web/PWA** for `www.bookitgy.com`)
- **Infra**: Docker Compose for Postgres/Redis/API

## Quick start

```bash
# 1) Backend
cp .env.example .env
cd infra
docker compose up --build -d

# Check:
curl http://localhost:4000/health
```

```bash
# 2) Frontend (web/PWA)
cd apps/mobile
npm install
EXPO_PUBLIC_API_URL="http://localhost:4000" npx expo start --web
```

## Deploy

- Point `api.bookitgy.com` to the server running the API (port 4000 behind Nginx HTTPS).
- Export the web app and deploy to Vercel/Cloudflare Pages, or serve via Nginx.
- Set `EXPO_PUBLIC_API_URL="https://api.bookitgy.com"` for the web build.

## Repository layout

```
bookitgy/
  apps/
    api/
    mobile/
  infra/
    docker-compose.yml
```

## Notes
- Money is stored in **GYD cents** (integers).
- Timezone fixed to **America/Guyana** for cron and luxon.
- Monthly statements: create on the **1st**, reminders on **5/10/15**, auto-lock on **16th** if unpaid.


## Admin console (web-only)

```
cd apps/admin
npm install
NEXT_PUBLIC_API_URL="http://localhost:4000" npm run dev
# Open http://localhost:5173
```

> Note: authenticate by obtaining an Admin JWT via the API (`/auth/register` with role=ADMIN, then `/auth/login`) and storing it in `localStorage.admin_token`.
