# Deployment Checklist ✅

## Prerequisites
- [ ] GitLab account (or push to GitHub)
- [ ] Railway account (supports GitLab & GitHub)
- [ ] Vercel account (supports GitLab & GitHub)
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

### 4️⃣ Frontend (Vercel)
- [ ] Go to https://vercel.com
- [ ] Add New Project → Import this repository
- [ ] Add environment variable:
  - `VITE_API_URL` = (your Railway URL from step 2)
- [ ] Deploy!
- [ ] Test: Visit your Vercel URL (should show events)

### 5️⃣ Verify Everything Works
- [ ] API health: `https://your-railway-url/health`
- [ ] API events: `https://your-railway-url/api/events` (should return JSON)
- [ ] Frontend: Visit your Vercel URL
- [ ] Filters work (genre, venue, date range, search)
- [ ] Events show correct data

### 6️⃣ Cron Job Verification
- [ ] In Railway dashboard → "Observability" → "Cron"
- [ ] Should see "daily-crawl" scheduled for 3 AM UTC
- [ ] Manual test: `railway run npm run refresh-data`
- [ ] Check logs for any errors

## What Gets Deployed

### Railway (API + Cron)
- Fastify API server
- Daily cron job (3 AM UTC) that runs `npm run refresh-data`
- Auto-restarts on failure

### Vercel (Frontend)
- Static React app (Vite build)
- SPA routing configured
- Auto-deploys on git push to your GitLab branch

### Neon (Database)
- PostgreSQL database
- Serverless (scales to zero when idle)
- Free tier: 0.5 GB storage, 100 compute hours/month

## Daily Crawl Schedule

Every day at 3 AM UTC, Railway runs:
1. Clear database (`node clear-db.js`)
2. Crawl all venues (`node crawl-all.js`)
   - Ticketmaster API
   - Kollektivet Livet
   - Debaser (Nova + Strand)
   - Fylkingen
   - Slakthusen (Slaktkyrkan, Hus 7, Terrassen, etc.)
   - Fasching
   - Pet Sounds
   - Nalen
   - Fållan
   - Södra Teatern
   - Rönnells Antikvariat
   - Banan-Kompaniet

## Costs

- **Neon**: Free (up to 0.5 GB)
- **Railway**: ~$5/month (500 free hours, then $0.01/hour)
- **Vercel**: Free (up to 100 GB bandwidth)

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

**Vercel build fails:**
- Check build logs in Vercel dashboard
- Ensure `VITE_API_URL` is set
- Try local build: `cd client && npm run build`

**No events showing:**
- Check Railway logs: `railway logs`
- Test API: `curl https://your-railway-url/api/events`
- Check browser console for CORS errors
- Verify database has data: `railway run node check-events.js`

**Cron not running:**
- Check Railway "Observability" → "Cron" tab
- Manually test: `railway run npm run refresh-data`
- Check for errors in logs

## Done! 🎉

Your Stockholm events aggregator is now live with:
- ✅ Public frontend on Vercel
- ✅ API on Railway
- ✅ Daily automatic updates at 3 AM
- ✅ 400+ events across 12 venues

**Share your Vercel URL and you're ready to go!**
