# Deployment Checklist ✅

## Prerequisites
- [ ] GitLab account (or push to GitHub)
- [ ] Railway account (supports GitLab & GitHub)
- [ ] Neon account (for database)

## Deployment Steps

### 1️⃣ Database (Neon)
- [ ] Create Neon account at https://neon.tech
- [ ] Create new project "stockholm-events"
- [ ] Copy connection string (save it!)

### 2️⃣ API (Railway)
- [ ] Go to https://railway.app
- [ ] Sign in with GitLab (or GitHub)
- [ ] New Project → Deploy from GitLab repo
- [ ] Select this repository and branch
- [ ] Add environment variables:
  - `DATABASE_URL` = (your Neon connection string)
  - `NODE_ENV` = production
- [ ] Wait for deployment (Railway auto-detects `railway.json`)
- [ ] Copy your Railway URL (e.g., `https://xxx.up.railway.app`)
- [ ] Test: Visit `https://your-railway-url/health` (should return `{"status":"ok"}`)

### 3️⃣ Database Setup
- [ ] Install Railway CLI: `npm i -g @railway/cli`
- [ ] Login: `railway login`
- [ ] Link project: `railway link`
- [ ] Run migrations: `railway run npm run db:push`
- [ ] Initial crawl: `railway run npm run refresh-data` (takes ~30 seconds)

### 4️⃣ Frontend (Railway — second service)
- [ ] In your Railway project: New Service → GitHub Repo → this repo
- [ ] Set the service **root directory** to `client/`
- [ ] Add environment variable (only if frontend & API are on different domains):
  - `VITE_API_URL` = (your Railway API URL from step 2)
  - If unset, the client falls back to `window.location.origin`
- [ ] Deploy! (Railway runs `npm run build`, serves `client/dist`)
- [ ] Test: Visit your Railway frontend URL (should show events)

### 5️⃣ Verify Everything Works
- [ ] API health: `https://your-railway-url/health`
- [ ] API events: `https://your-railway-url/api/events` (should return JSON)
- [ ] Frontend: Visit your Railway frontend URL
- [ ] Filters work (genre, venue, date range, search)
- [ ] Events show correct data

### 6️⃣ Cron Job Verification
- [ ] In Railway dashboard → "Observability" → "Cron"
- [ ] Should see "daily-crawl" scheduled for 3 AM UTC
- [ ] Manual test: `railway run npm run refresh-data`
- [ ] Check logs for any errors

## What Gets Deployed

### Railway (API + Cron + Frontend)
- Fastify API server
- Static frontend (Vite build of `client/`, served as a separate Railway service)
- Daily cron job (3 AM UTC) that runs `npm run refresh-data`
- Auto-restarts on failure

### Neon (Database)
- PostgreSQL database
- Serverless (scales to zero when idle)
- Free tier: 0.5 GB storage, 100 compute hours/month

## Daily Crawl Schedule

Every day at 3 AM UTC, Railway runs:
1. Clear database (`node clear-db.js`)
2. Crawl all venues (`node crawl-all.js`)
   - Ticketmaster API, DICE, Klubb Död, Stockholm Live, Tickster, RA, Techno i Stockholm (TS crawlers)
   - Kollektivet Livet, Debaser, Fylkingen, Slakthusen, Fasching, Pet Sounds, Nalen,
     Fållan, Södra Teatern, Rönnells, Banan-Kompaniet, Under Bron, and more (JS crawlers)
   - Non-concert pruning + duplicate consolidation + genre inference run at the end

## Costs

- **Neon**: Free (up to 0.5 GB)
- **Railway**: ~$5/month (500 free hours, then $0.01/hour) — covers API + frontend services

**Total: ~$5/month** (or free if under Railway's 500 hour limit)

## Troubleshooting

**Railway deployment fails:**
```bash
# Check logs
railway logs

# Re-trigger deployment
git commit --allow-empty -m "Trigger deploy"
git push
```

**Frontend build fails:**
- Check build logs in Railway dashboard (frontend service)
- Ensure `VITE_API_URL` is set if frontend & API are on different domains
- Try local build: `cd client && npm run build`

**No events showing:**
- Check Railway logs: `railway logs`
- Test API: `curl https://your-railway-url/api/events`
- Check browser console for CORS errors
- Verify database has data: `railway run node clear-db.js && railway run node crawl-all.js`

**Cron not running:**
- Check Railway "Observability" → "Cron" tab
- Manually test: `railway run npm run refresh-data`
- Check for errors in logs

## Done! 🎉

Your Stockholm events aggregator is now live with:
- ✅ Public frontend on Railway
- ✅ API on Railway
- ✅ Daily automatic updates at 3 AM
- ✅ 400+ events across 12 venues

**Share your Railway frontend URL and you're ready to go!**
