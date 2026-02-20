# Technology Stack

**Project:** Stockholm Music Events Calendar
**Researched:** 2026-02-20
**Confidence:** HIGH

## Recommended Stack

### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15.x | Full-stack web framework | Industry standard for React SSR/SSG with App Router. Native support for server components, API routes, and cron jobs via Vercel. Built-in optimizations for production. React 19 support stable as of Oct 2024. |
| React | 19.x | UI library | Required by Next.js 15 App Router. Server Components reduce bundle size, Suspense for streaming, improved hydration error messages. |
| TypeScript | 5.8.x | Type safety | Latest stable (Feb 2025). Improved inference, better ecosystem interoperability, faster builds. Native next.config.ts support in Next.js 15. |
| Node.js | 18.18.0+ | Runtime environment | Minimum required by Next.js 15. Event-driven architecture ideal for concurrent scraping tasks. |

### Database & ORM
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL | 16.x | Primary database | Superior for structured event data with complex queries (filtering by date/genre/venue). JSONB for flexible metadata. ACID compliance ensures data integrity. Better for read-heavy workloads than MongoDB. |
| Prisma ORM | 7.x | Database client | Latest stable (2025). Rust-free client = 90% smaller bundle, 3x faster queries. Type-safe schema, excellent PostgreSQL support, migration tooling. Direct Prisma Postgres connection support. |

### Web Scraping
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Playwright | 1.58.x | Browser automation | Latest stable. Industry standard for modern web scraping. Full browser support (Chromium/Firefox/WebKit). Handles SPAs and JavaScript-rendered content (Ticketmaster, AXS, DICE all use dynamic content). Headless mode for production, headed for debugging. Anti-detection features built-in. |
| Crawlee | 3.x | Scraping framework | Production-grade framework from Apify. Unified interface for Playwright/HTTP crawling. Built-in queue management, rate limiting, session rotation, proxy support. Auto-scaling, retry logic, and state persistence. Designed to bypass bot detection. |
| Cheerio | 1.x | HTML parsing | Fast jQuery-like HTML parser (~0.5s vs 4s for browser). Use for static HTML endpoints if available. Pair with Crawlee's HttpCrawler for performance. |

### Scheduling & Jobs
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel Cron Jobs | Native | Daily scraping trigger | Native Next.js integration via vercel.json. Pro plan allows 40 cron jobs with minute-level precision. CRON_SECRET for authentication. Simpler than external queue systems for basic daily scraping. |
| BullMQ | 5.16.x+ | Job queue (if needed) | Only if Vercel cron limitations hit. Redis-based, supports complex scheduling, retries, distributed processing. Job Schedulers API (v5.16.0+) for repeatable jobs. Overkill for MVP but production-ready for scale. |

### Calendar UI
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React Big Calendar | 1.x | Calendar component | 743K weekly downloads. Free/open-source (MIT). React-native patterns (props, hooks). Customizable event rendering. Month/week/day views built-in. Drag-and-drop via addon. Better for React-first projects than FullCalendar (which is framework-agnostic with premium features). |
| Tailwind CSS | 4.x | Styling | Latest stable (early 2025). 5x faster builds, 100x faster incremental. CSS-first @theme config. Automatic content detection. Modern CSS features (cascade layers, @property). Standard for rapid UI development. |
| Shadcn/UI | Latest | Component library | Built on Radix UI + Tailwind. Copy/paste components (no npm bloat). Accessible, themeable. Calendar components via react-day-picker integration. De facto standard for Next.js + Tailwind projects. |

### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | 4.x | Schema validation | Validate scraped event data before DB insertion. Type-safe with TypeScript. Latest (4.3.6) adds exclusive unions, localization, soundness improvements. |
| date-fns | 3.x | Date manipulation | Lightweight (tree-shakeable), immutable, TypeScript-first. Better bundle size than Moment.js. Essential for date filtering/formatting in calendar views. |
| Axios | 1.x | HTTP client (optional) | Only if not using Playwright/Crawlee. Auto JSON parsing, better error handling than Fetch. Good for simple API endpoints if platforms provide them. Native Fetch API preferred in Next.js 15 (no bundle cost). |
| React Query (TanStack Query) | 5.x | Server state management | Client-side caching for event data. Automatic refetching, optimistic updates. Reduces API calls for calendar navigation. Optional for MVP, valuable for UX. |

### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| ESLint | Linting | Next.js 15 supports ESLint 9. Use flat config format. eslint-plugin-react-hooks@5.0.0 for React 19. |
| Prettier | Code formatting | Standard for consistent formatting. Integrate with ESLint via eslint-config-prettier. |
| Turbopack | Dev server | Stable in Next.js 15 (next dev --turbo). 76.7% faster startup, 96.3% faster HMR for large apps. |
| GitHub Actions | CI/CD | Vercel auto-deploys from Git. Use Actions for testing scraper logic, type-checking, linting. |

## Installation

```bash
# Core framework
npm install next@latest react@rc react-dom@rc

# Database & ORM
npm install @prisma/client
npm install -D prisma

# Web scraping
npm install playwright crawlee cheerio

# Validation & utilities
npm install zod date-fns

# Calendar UI
npm install react-big-calendar
npm install -D tailwindcss postcss autoprefixer

# Optional: Server state management
npm install @tanstack/react-query

# Dev dependencies
npm install -D typescript @types/node @types/react @types/react-dom
npm install -D eslint eslint-config-next prettier
npm install -D @playwright/test  # For scraper testing
```

```bash
# Initialize Playwright browsers
npx playwright install chromium  # Only Chromium for production
```

```bash
# Initialize Prisma
npx prisma init
```

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Web Framework | Next.js 15 | Remix, Astro | Next.js has best Vercel integration (cron jobs, edge functions). Larger ecosystem. Remix lacks native cron. Astro more static-focused. |
| Database | PostgreSQL | MongoDB | PostgreSQL better for structured event data with relational queries (venue → events, artist → events). JSONB provides flexibility where needed. MongoDB better for write-heavy/schema-less, but events have fixed schema. |
| ORM | Prisma 7 | Drizzle, TypeORM | Prisma has best DX, migrations, type generation. Drizzle is faster but less mature. TypeORM maintenance concerns. |
| Browser Automation | Playwright | Puppeteer | Playwright supports multi-browser, better API, active development by Microsoft. Puppeteer Chrome-only, slower evolution. Both similar performance. |
| Scraping Framework | Crawlee | Custom (Playwright + Queue) | Crawlee provides production-ready queue, retry, rate-limiting, session management out-of-box. Custom = reinventing wheel. Crawlee is battle-tested (Apify). |
| Calendar UI | React Big Calendar | FullCalendar | RBC is free, React-native, sufficient features for MVP. FullCalendar has premium tier, framework-agnostic overhead. RBC has 743K downloads vs FullCalendar 208K. |
| Styling | Tailwind 4 | CSS Modules, Styled Components | Tailwind fastest dev velocity, best Next.js integration. v4 performance gains (5x faster). Utility-first scales better than CSS-in-JS for large apps. |
| HTTP Client | Playwright/Crawlee | Axios, Got, Fetch | Ticketmaster/AXS/DICE use SPAs → need browser automation. Axios only if APIs exist (they don't for crawling). Native Fetch for simple cases. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Puppeteer | Chrome-only, slower development, less features than Playwright | Playwright |
| Moment.js | Deprecated, massive bundle (232KB), unmaintained | date-fns (tree-shakeable, 2-5KB per function) |
| TypeORM | Maintenance issues, decorator-based (outdated pattern), slower than Prisma | Prisma ORM |
| MongoDB (for this use case) | Event schema is fixed (date, venue, artist, price), relational queries common (filter by venue/artist), read-heavy workload | PostgreSQL with JSONB for flexible fields |
| node-cron | No persistence, no retries, stops on server restart, not distributed | Vercel Cron Jobs (simple) or BullMQ (complex) |
| Cheerio alone | Ticketmaster/AXS/DICE render events client-side → need browser | Playwright + Cheerio combo via Crawlee |
| Next.js Pages Router | Legacy, no Server Components, slower than App Router | Next.js 15 App Router |
| Create React App | Unmaintained, no SSR, slower than Next.js | Next.js |
| Axios (as primary) | Native Fetch in Next.js 15 has no bundle cost, integrated caching. Axios adds 11.7KB. Only use if specific features needed. | Native Fetch API |

## Stack Patterns by Variant

**If platform provides public API (unlikely):**
- Use native Fetch API for simple HTTP requests
- Skip Playwright/Crawlee overhead
- Faster, cheaper, more reliable than scraping

**If platform is static HTML (unlikely for ticket sites):**
- Use Crawlee's HttpCrawler + Cheerio
- 8x faster than Playwright (~0.5s vs 4s)
- Lower resource usage

**If platform heavily throttles requests:**
- Add BullMQ + Redis for distributed queue
- Configure Crawlee with proxy rotation
- Implement exponential backoff
- Consider multiple IP addresses

**If scaling beyond daily scraping:**
- Move from Vercel Cron to BullMQ
- Add Redis for job queue persistence
- Use Playwright's multiple browser contexts
- Consider headless browser services (Browserless.io)

**If event data changes frequently:**
- Add React Query for client-side caching
- Implement optimistic UI updates
- Use Next.js ISR (Incremental Static Regeneration) for event pages

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 15.x | React 19 | App Router requires React 19. Pages Router supports React 18. Don't mix versions. |
| Next.js 15.x | Node.js 18.18.0+ | Minimum version enforced. Node 20+ recommended. |
| Prisma 7.x | PostgreSQL 12+ | PostgreSQL 16 recommended for best performance. |
| Playwright 1.58.x | Node.js 18+ | Chromium/Firefox/WebKit auto-updated via npx playwright install. |
| Crawlee 3.x | Playwright 1.x | Playwright integration stable. Also supports Puppeteer/Cheerio. |
| React Big Calendar 1.x | React 16.8+ | Works with React 19. Peer dependency satisfied. |
| Tailwind CSS 4.x | PostCSS 8+ | Use @tailwindcss/postcss plugin (replaces tailwindcss PostCSS plugin). |
| TypeScript 5.8.x | Next.js 15 | Full support for next.config.ts. Tested against TS 5.5+. |
| Zod 4.x | TypeScript 5.5+ | Older TS versions not officially supported. |

## Deployment Architecture

**Vercel (Recommended):**
- Next.js native platform
- Automatic deployments from Git
- Vercel Cron Jobs for daily scraping (vercel.json config)
- Edge Functions for API routes (low latency)
- PostgreSQL via Vercel Postgres or Supabase
- Environment variables for API keys/DB credentials
- Limitations: Cron jobs are HTTP-based (10s timeout on Hobby, 300s on Pro)

**Self-Hosted (Alternative):**
- Use standalone Next.js output mode (next.config.js: output: 'standalone')
- Docker container with Node.js
- PostgreSQL on managed service (AWS RDS, DigitalOcean, Railway)
- BullMQ + Redis for job scheduling
- CRON on host machine or K8s CronJob
- More control over Cache-Control headers
- Sharp auto-installed for image optimization (no manual install needed in Next.js 15)

## Performance Targets

| Metric | Target | Why |
|--------|--------|-----|
| Scraping duration | < 5 min/platform | 3 platforms × 5 min = 15 min total. Fits in Vercel Pro timeout (300s per request, multiple requests OK). |
| Database write speed | > 100 events/sec | Prisma batch insert. 3 platforms × ~100 events = 300 events → 3s write time. |
| Calendar page load | < 1s (LCP) | Next.js SSG for calendar pages. Prerender month view. Server Components reduce JS. |
| Client-side navigation | < 200ms | React Big Calendar + cached data. No API calls on view switch. |

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Scraping detection | Crawlee's built-in anti-bot (randomized headers, delays). Rotate user agents. Use residential proxies if needed. |
| Database credentials | Environment variables (.env.local). Never commit. Use Vercel env vars in production. |
| Rate limiting | Respect robots.txt. Add delays (Crawlee config). Monitor for IP bans. |
| CRON_SECRET | Vercel provides auto. Verify in API route headers to prevent unauthorized scraping triggers. |
| Server Actions | Next.js 15 uses unguessable IDs. Dead code elimination removes unused actions. |
| Data validation | Zod schema validation before DB insert. Prevent malformed data from breaking calendar UI. |

## Sources

**High Confidence (Official Docs + Verified):**
- [Next.js 15 Release Notes](https://nextjs.org/blog/next-15) — Core framework features, React 19 support, caching changes (HIGH)
- [Prisma 7 Announcement](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0) — Performance improvements, Rust-free client (HIGH)
- [Playwright npm](https://www.npmjs.com/package/playwright) — Version 1.58.2 stable (HIGH)
- [TypeScript 5.8 Release](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8/) — Feb 2025 GA, improved inference (HIGH)
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4) — Performance gains, CSS-first config (HIGH)
- [Zod Releases](https://github.com/colinhacks/zod/releases) — v4.3.6, exclusive unions, localization (HIGH)

**Medium Confidence (Multiple Sources + Community):**
- [Puppeteer vs Playwright 2026 Comparison](https://medium.com/@sohail_saifi/puppeteer-vs-playwright-which-web-scraper-should-you-actually-use-0c874cdcac2f) — Playwright advantages (MEDIUM)
- [Cheerio vs Puppeteer Performance](https://proxyway.com/guides/cheerio-vs-puppeteer-for-web-scraping) — 0.5s vs 4s benchmarks (MEDIUM)
- [Crawlee GitHub](https://github.com/apify/crawlee) — Framework features, anti-detection (MEDIUM)
- [React Big Calendar vs FullCalendar](https://bryntum.com/blog/react-fullcalendar-vs-big-calendar/) — Licensing, features, downloads (MEDIUM)
- [PostgreSQL vs MongoDB 2026](https://www.sevensquaretech.com/mongodb-vs-postgresql/) — Use case recommendations (MEDIUM)
- [BullMQ vs node-cron](https://betterstack.com/community/guides/scaling-nodejs/best-nodejs-schedulers/) — Production reliability comparison (MEDIUM)
- [Vercel Cron Jobs Guide](https://vercel.com/docs/cron-jobs/manage-cron-jobs) — Limitations, pricing tiers (MEDIUM)
- [Node.js Web Scraping Best Practices 2025-2026](https://www.zenrows.com/blog/javascript-nodejs-web-scraping-libraries) — Tool recommendations (MEDIUM)
- [Axios vs Fetch 2026](https://scrapingant.com/blog/axios-vs-fetch) — Bundle size, error handling (MEDIUM)

---
*Stack research for: Stockholm Music Events Calendar*
*Researched: 2026-02-20*
*Confidence: HIGH — Core technologies verified with official docs and release notes. Web scraping ecosystem validated across multiple industry sources.*
