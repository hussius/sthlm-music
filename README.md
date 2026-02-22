# Stockholm Music Events

A web app that aggregates upcoming live music events across Stockholm venues into a single, searchable feed.

## What it does

Crawls ~19 Stockholm venues and ticketing platforms daily, deduplicates events, and serves them through a filterable UI. Filter by venue, date range, or search by artist/event name.

## Stack

- **Frontend** — React + TypeScript + Vite + Tailwind CSS
- **Backend** — Fastify + Drizzle ORM + PostgreSQL (Neon)
- **Crawlers** — Node.js scripts using Cheerio (static HTML) and Playwright (JS-rendered pages)
- **Deployment** — Railway (backend + frontend), cron job runs daily at 03:00

## Running locally

```bash
npm install
npx playwright install chromium

# Copy and fill in your database URL
cp .env.example .env.local

# Push schema to DB
npm run db:push

# Run all crawlers
npm run crawl-all

# Start the dev server
npm run dev
```

Frontend runs on `http://localhost:5173`, API on `http://localhost:3000`.

## Crawlers

Individual crawlers live in `crawl-*.js` at the project root. `crawl-all.js` runs them all in sequence.

| Script | Source | Venue(s) |
|---|---|---|
| `crawl-nalen.js` | nalen.com | Nalen |
| `crawl-stadsgarden.js` | stadsgardsterminalen.com | Kollektivet Livet |
| `crawl-banan-kompaniet.js` | b-k.se | Banankompaniet |
| `crawl-fasching.js` | fasching.se | Fasching |
| `crawl-debaser.js` | debaser.se | Debaser Nova, Debaser Strand |
| `crawl-slaktkyrkan.js` | slaktkyrkan.com | Slaktkyrkan |
| `crawl-fallan.js` | fallan.se | Fållan |
| `crawl-petsounds.js` | petsounds.se | Pet Sounds |
| `crawl-ronnells.js` | ronnells.se | Rönnells Antikvariat |
| `crawl-sodrateatern.js` | sodrateatern.com | Södra Teatern |
| `crawl-fylkingen.js` | fylkingen.se | Fylkingen |
| `crawl-billetto.js` | billetto.se | Multiple venues |
| `crawl-ticketmaster.js` | ticketmaster.se | Multiple venues |
| `crawl-landet-billetto.js` | billetto.se | Landet |
| `crawl-berns.js` | berns.se | Berns |
| `crawl-cirkus.js` | cirkus.se | Cirkus |
| `crawl-stampen.js` | stampen.se | Stampen |
| `crawl-gamla-enskede-bryggeri.js` | gamlaenskedebryggeri.se | Gamla Enskede Bryggeri |

To add a new venue, create a `crawl-<venue>.js` and add it to `crawl-all.js`.

## Database

Uses [Drizzle ORM](https://orm.drizzle.team/) with a Neon PostgreSQL database.

```bash
npm run db:studio   # Browse data in Drizzle Studio
npm run db:push     # Push schema changes
```

## Deployment

Hosted on Railway. Two services: API/backend and the static frontend. Both deploy automatically from the `main` branch. A Railway cron job runs `npm run refresh-data` (clear + re-crawl) every night at 03:00.
