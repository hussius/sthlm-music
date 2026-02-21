# Stockholm Events - Deployment Guide

Complete deployment instructions for the Stockholm music events aggregator.

---

## Architecture

- **Frontend**: Vite + React → Vercel (static hosting)
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

**Copy your Railway API URL** - you'll need it for Vercel!

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

### 4. Deploy Frontend to Vercel

1. Go to **[vercel.com](https://vercel.com)** and sign in with **GitLab** (or GitHub)
2. Click **"Add New Project"** → Import this repository
3. Select your branch
4. Vercel will auto-detect the `vercel.json` config

**Configure environment variable:**
- Add this variable:
  ```
  VITE_API_URL=<your-railway-url>
  ```
  Example: `https://stockholm-events.up.railway.app`

4. Click **"Deploy"**

Vercel will:
- Install dependencies
- Build the React app (`cd client && npm run build`)
- Deploy to a URL like `https://stockholm-events.vercel.app`

---

## Verification

### Check API
Visit: `https://your-railway-url/api/events`

Should return JSON with events.

### Check Frontend
Visit: `https://your-vercel-url`

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
2. `node crawl-all.js` - Crawls all venues

**Crawled venues:**
- Ticketmaster (API)
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
- Vercel should auto-configure SPA routing
- Check `vercel.json` has the rewrite rule

**No events showing:**
- Check API health: `https://your-railway-url/api/events`
- Check browser console for CORS errors
- Verify `VITE_API_URL` in Vercel settings

**Cron not running:**
- Check Railway "Observability" → "Cron" tab
- Manually test: `railway run npm run refresh-data`
- Check logs for crawler errors

---

## Cost Estimates

- **Neon**: Free tier (0.5 GB storage, 100 hours compute/month)
- **Railway**: ~$5/month (500 hours free, then $0.01/hour)
- **Vercel**: Free tier (100 GB bandwidth)

**Total: ~$5/month or free if under limits**
