# Stockholm Events - Deployment Guide

Complete deployment instructions for the Stockholm music events aggregator.

---

## Architecture

- **Frontend**: Vite + React → Railway (static hosting, separate service)
- **Backend**: Fastify API → Railway (Node.js server)
- **Database**: PostgreSQL → Neon (serverless)
- **Cron**: Railway Cron (daily crawls at 3 AM)

---

## Step-by-Step Deployment

### 1. Set Up Database (Neon)

1. Go to **[neon.tech](https://neon.tech)** and create account
2. Create new project: "stockholm-events"
3. Copy the **connection string** (starts with `postgresql://`)
4. Keep this handy - you'll need it for Railway

---

### 2. Deploy API to Railway

1. Go to **[railway.app](https://railway.app)** and sign in with **GitLab** (or GitHub)
2. Click **"New Project"** → **"Deploy from GitLab repo"**
3. Select this repository and your branch
4. Railway will auto-detect Node.js and use `railway.json` config

**Configure environment variables:**
- Click **"Variables"** tab
- Add these variables:
  ```
  DATABASE_URL=<your-neon-connection-string>
  NODE_ENV=production
  ```

**Railway will automatically:**
- Run `npm run build` (builds TypeScript)
- Run `npm run start` (starts Fastify server)
- Set up daily cron at 3 AM to run `npm run refresh-data`
- Give you a public URL like `https://your-app.up.railway.app`

**Copy your Railway API URL** - you'll need it for the frontend config!

---

### 3. Run Database Migrations

Using Railway CLI:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run npm run db:push

# Initial data load (optional - cron will do this daily)
railway run npm run refresh-data
```

Or run migrations from your Railway dashboard using the **"Run Command"** feature.

---

### 4. Deploy Frontend to Railway (separate service)

The frontend is a static Vite build, deployed as a second Railway service
from the same repo (`client/` directory).

1. In your Railway project, click **"New Service"** → **"GitHub Repo"**
2. Select this repository again (same branch)
3. Set the **root directory** to `client/` so Railway builds the frontend
4. Railway builds with `npm run build` and serves `client/dist` as static files

**Configure environment variable:**
- Add this variable (only needed if frontend and API are on *different* domains):
  ```
  VITE_API_URL=<your-railway-api-url>
  ```
  Example: `https://stockholm-events-api.up.railway.app`

  If the frontend and API are served from the same origin (e.g. via a Railway
  custom domain or proxy), leave `VITE_API_URL` unset — the client falls back
  to `window.location.origin` (see `client/src/api/client.ts`).

Railway will:
- Install dependencies (`npm ci` in `client/`)
- Build the React app (`npm run build`)
- Serve `client/dist` at a URL like `https://stockholm-events-frontend.up.railway.app`

---

## Verification

### Check API
Visit: `https://your-railway-url/api/events`

Should return JSON with events.

### Check Frontend
Visit: `https://your-railway-frontend-url`

Should show the event list with filters.

### Check Cron Job
In Railway dashboard:
1. Go to **"Observability"** tab
2. Look for cron job logs (runs daily at 3 AM UTC)
3. Or manually trigger: `railway run npm run refresh-data`

---

## Daily Crawling Schedule

The `railway.json` configures a cron job:
```json
{
  "cron": [{
    "name": "daily-crawl",
    "schedule": "0 3 * * *",  // 3 AM UTC daily
    "command": "npm run refresh-data"
  }]
}
```

This runs:
1. `node clear-db.js` - Clears old events
2. `node crawl-all.js` - Crawls all venues (TS + JS), prunes non-concert events, consolidates duplicates, infers genres

**Crawled venues include:**
- Ticketmaster (API)
- DICE (API)
- Kollektivet Livet
- Debaser (Nova + Strand)
- Fylkingen
- Slakthusen (Slaktkyrkan, Hus 7, etc.)
- Fasching
- Pet Sounds
- Nalen
- Fållan
- Södra Teatern
- Rönnells Antikvariat
- Banan-Kompaniet
- Under Bron
- and others (see `crawl-all.js` for the full list)

---

## Local Development

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Set up environment
cp .env.example .env.local
# Add your DATABASE_URL

# Run migrations
npm run db:push

# Start API (terminal 1)
npm run dev

# Start frontend (terminal 2)
cd client && npm run dev

# Crawl events
npm run refresh-data
```

Visit:
- API: http://localhost:3001/api/events
- Frontend: http://localhost:3000

---

## Troubleshooting

**API not starting on Railway:**
- Check **"Deploy Logs"** for build errors
- Ensure `DATABASE_URL` is set
- Run `railway logs` to see runtime errors

**Frontend 404 on routes:**
- Ensure SPA fallback routing is configured for the static host
- Railway static sites: add a rewrite to `index.html` for unknown paths
  (client-side router handles them)

**No events showing:**
- Check API health: `https://your-railway-api-url/api/events`
- Check browser console for CORS errors
- If frontend and API are on different domains, verify `VITE_API_URL` is set
  in the frontend Railway service variables

**Cron not running:**
- Check Railway "Observability" → "Cron" tab
- Manually test: `railway run npm run refresh-data`
- Check logs for crawler errors

---

## Cost Estimates

- **Neon**: Free tier (0.5 GB storage, 100 hours compute/month)
- **Railway**: ~$5/month (500 hours free, then $0.01/hour) — covers both API and frontend services

**Total: ~$5/month or free if under limits**
