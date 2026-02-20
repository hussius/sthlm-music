# Project Research Summary

**Project:** Stockholm Music Events Calendar
**Domain:** Event Aggregation Platform (Music Events)
**Researched:** 2026-02-20
**Confidence:** MEDIUM-HIGH

## Executive Summary

Stockholm Music Events Calendar is a web scraping and data aggregation platform that consolidates music events from multiple ticket platforms (Ticketmaster SE, AXS/Live Nation, DICE) into a unified calendar interface. Expert implementations use headless browser automation for JavaScript-rendered content, robust deduplication strategies to prevent duplicate events, and scheduled batch processing rather than real-time scraping. The technical challenge lies not in displaying events, but in reliably extracting them from anti-bot protected platforms and maintaining data quality as sites evolve.

The recommended approach is a modular monolith architecture using Next.js 15 + PostgreSQL with Playwright/Crawlee for scraping. Start with a single platform to prove the data pipeline (scrape → normalize → deduplicate → store), then scale to multiple sources. Deploy on Vercel with native cron jobs for daily scraping. This stack balances rapid development velocity with production reliability while keeping infrastructure costs low during validation.

Critical risks center on web scraping sustainability: fragile CSS selectors that break on platform updates, legal concerns around Terms of Service violations, IP bans from anti-bot systems, and timezone/deduplication complexity. Mitigate through: (1) prioritizing official APIs over scraping where available, (2) building robust selectors with fallbacks from day one, (3) implementing monitoring that alerts on scraper failures within minutes, and (4) hash-based deduplication with proper timezone handling from the start. These cannot be retrofitted easily—they must be architectural decisions in Phase 1.

## Key Findings

### Recommended Stack

Modern event aggregation platforms are built on React-based full-stack frameworks with PostgreSQL for structured event data and headless browsers for scraping JavaScript-heavy ticket platforms. The 2026 ecosystem has matured significantly with Playwright becoming the industry standard for browser automation, Crawlee providing production-grade scraping infrastructure, and Next.js 15 offering native serverless cron job support on Vercel.

**Core technologies:**
- **Next.js 15 + React 19**: Full-stack framework with App Router, Server Components, and native Vercel Cron job integration — industry standard with best deployment experience
- **PostgreSQL 16 + Prisma ORM 7**: Relational database for structured event data with JSONB flexibility, paired with type-safe ORM (90% smaller bundle, 3x faster queries than Prisma 6)
- **Playwright 1.58 + Crawlee 3**: Browser automation for JavaScript-rendered sites (Ticketmaster, AXS, DICE) with production-ready queue management, rate limiting, and anti-bot measures
- **React Big Calendar**: Free MIT-licensed calendar component with 743K weekly downloads — sufficient for MVP vs premium FullCalendar
- **Tailwind CSS 4**: Utility-first styling with 5x faster builds — standard for rapid UI development
- **Zod 4**: Schema validation for scraped data before database insertion — prevents malformed events from breaking UI

**What NOT to use:**
- Puppeteer (Chrome-only, less features than Playwright)
- MongoDB (event schema is fixed and relational, not document-oriented)
- Cheerio alone (ticket platforms render content client-side, need browser)
- node-cron (no persistence, stops on restart — use Vercel Cron or BullMQ)

### Expected Features

Event aggregation users have clear expectations formed by established platforms (Songkick, Bandsintown). Table stakes are comprehensive: date/genre/venue filtering, search, mobile responsiveness, and direct ticket purchase links. Differentiators come from aggregation quality (deduplication, 12-month horizon) rather than novel features.

**Must have (table stakes):**
- Date-based filtering (month/week/day views) — core planning use case
- Genre filtering with taxonomy (Rock, Electronic, Jazz, etc.) — primary discovery method
- Venue information and filtering — users plan around location
- Artist/performer listing with search — finding specific shows
- Ticket purchase deep links to official sellers — conversion path
- Mobile-responsive design — 60%+ of traffic
- Event details display (name, datetime, venue, genre, availability)

**Should have (competitive differentiators):**
- Comprehensive aggregation across Ticketmaster SE + AXS + DICE — beats single-platform calendars
- Event deduplication across platforms — same event shown once with multiple purchase options
- 12-month rolling window — longer planning horizon than typical 3-6 months
- Advanced filtering combinations (genre + venue + date range) — enables complex queries like "Rock concerts at Annexet in March"
- No authentication required for browsing — frictionless discovery
- Calendar export (iCal) for filtered views — high value for planners

**Defer (v2+):**
- User accounts and personalization — adds complexity without validation
- Artist tracking notifications — Songkick/Bandsintown already excel here, defer until post-PMF
- Multi-city support — validate Stockholm first before expanding
- Social features — scope creep, focus on aggregation quality
- Real-time seat selection — link to ticketing platforms, don't replicate their features

**Anti-features (explicitly avoid):**
- Ticket purchasing/checkout — legal minefield, complex regulations
- Event creation/submission — opens spam risk, maintain quality through controlled sources

### Architecture Approach

Event aggregation systems follow a layered architecture: scheduled scrapers extract raw data → normalization pipeline standardizes formats → deduplication service merges duplicates → API serves filtered results → calendar UI renders events. The critical insight from research is that this is a read-heavy workload (99% reads, 1% writes) which favors denormalized schemas and aggressive caching over normalized relational design.

**Major components:**
1. **Scraper Layer** (per-platform) — Browser automation with Playwright/Crawlee to extract event data from ticket platforms. Must handle anti-bot measures (user-agent rotation, delays, proxy support). Base scraper class enforces common patterns.
2. **Data Pipeline** — Normalizer standardizes dates/venues/artists, Deduplicator generates hashes to detect same event across platforms, Enricher adds missing metadata. This runs after scraping, before database insertion.
3. **Storage Layer** — PostgreSQL with denormalized event schema for read performance. Store venue object and artist array directly in event document to avoid joins. Index on (date, genre, venue_id).
4. **API Layer** — REST endpoints with server-side filtering (never client-side on full dataset). Query builder uses database indexes for <200ms response. Pagination required for 12-month window.
5. **Calendar UI** — React Big Calendar with virtual rendering for 10,000+ events. Debounced filter state triggers API calls. Loading states essential for UX.
6. **Scheduler** — Vercel Cron Jobs for daily scraping (simpler than BullMQ for MVP). Migrate to job queue only if Vercel limits are hit.

**Architectural patterns:**
- **Modular Monolith**: Single deployable with well-defined module boundaries. Research shows microservices benefits only appear with teams >10 developers. Start monolithic.
- **Hash-Based Deduplication**: Generate SHA-256 hash from normalized `title + date + venue`. Fast O(1) lookups, handles exact duplicates. Use ±1 hour time window for slight variations.
- **Denormalized Schema**: Store venue/artist data directly in event document for read performance. This is read-heavy (users browse >> platforms add events).
- **Server-Side Filtering**: Filter at database query level, not in-memory after fetch. Reduces payload, enables pagination, leverages indexes.

### Critical Pitfalls

Web scraping for event aggregation has well-documented failure modes. The top pitfalls from research center on legal/technical sustainability of scraping, data quality degradation over time, and performance issues with large datasets.

1. **Naive scraping without legal API usage** — Scraping ticket platforms without checking for official APIs violates ToS and risks IP bans/legal action. Always start with API research; Ticketmaster offers Discovery API with 5000 calls/day. Document legal review. Use scraping only as last resort with ToS verification.

2. **Fragile CSS selectors that break on layout changes** — Hardcoded selectors like `.event-card-2024` break when platforms update UI, causing silent data loss (most common scraper failure mode). Target semantic HTML (`<article>`, `<time>`, ARIA attributes) with multiple fallback selectors. Monitor scraper results daily and alert on zero events returned.

3. **Missing or wrong event deduplication logic** — Same event appears 3x (once per platform) ruining credibility, or fuzzy matching is too aggressive and hides legitimate events. Implement composite deduplication: hash of `normalized_title + venue_id + datetime_window(±1h)`. Store source IDs to track provenance. Test with known edge cases (multi-day festivals, artist name variations).

4. **Timezone hell and date parsing failures** — Inconsistent timezone storage (local without offset, UTC mixed with local, ambiguous "CET") causes events to display at wrong times. Always store as PostgreSQL `timestamptz` (UTC). Parse with explicit timezone context using IANA zone names, never abbreviations. Convert to local time only at UI rendering. Test DST transitions.

5. **Silent scraper failures** — Scrapers fail due to rate limits/site changes/network issues but nobody knows until stakeholders ask "where are the events?" Implement real-time alerting on: (1) scraper success/failure rates per source, (2) zero events after retries, (3) data shape changes, (4) scraper hasn't run in X hours. Alert on business metrics (events/day/source) not just technical metrics.

6. **Memory leaks from headless browser mismanagement** — Puppeteer/Playwright instances aren't closed, creating zombie Chrome processes until OOM crash. Reuse browser instances, close in finally blocks, set page timeouts (30s), monitor Chrome process count. Prefer Playwright for better memory cleanup.

7. **12-month rolling window performance nightmare** — Loading all 12 months (10,000+ events) at once causes slow load and laggy UI. Implement virtual rendering, server-side pagination, fetch only visible month + 1 buffer. Index database on (date, genre, venue_id). Performance issues compound exponentially if deferred.

## Implications for Roadmap

Based on research, the build order must follow: prove data pipeline with single platform → validate API and deduplication → build UI → scale to multiple platforms. This order minimizes rework and validates core assumptions (can we reliably scrape? does deduplication work?) before investing in UI polish or multi-platform complexity.

### Phase 1: Data Foundation & Single-Platform Scraper
**Rationale:** Must prove data pipeline works (scrape → store → dedupe) before building anything else. Starting with 1 platform (Ticketmaster SE) validates assumptions while keeping scope manageable. PostgreSQL schema and timezone handling must be correct from the start—retrofitting is expensive.

**Delivers:**
- PostgreSQL database schema with proper timezone support (`timestamptz`)
- Ticketmaster SE scraper using Playwright + Crawlee
- Normalization service (standardize dates, venues, artists)
- Hash-based deduplication service (composite key)
- Monitoring and alerting for scraper health
- Vercel deployment with basic cron job

**Addresses features:**
- Data crawling (1 platform)
- Event details display (database → API)
- Event deduplication logic

**Avoids pitfalls:**
- Timezone hell (Phase 1 schema design)
- Fragile selectors (robust selector patterns from start)
- Silent scraper failures (monitoring concurrent with implementation)
- Legal API usage (research API availability first)

**Research flag:** Phase 1 needs `/gsd:research-phase` for Ticketmaster API/scraping specifics (legal ToS review, API rate limits, selector strategy)

---

### Phase 2: API Layer & Deduplication Validation
**Rationale:** With database populated from Phase 1, build API to serve data before investing in UI. This validates deduplication logic with real data and establishes performance baseline. Must implement server-side filtering from the start—retrofitting is architecturally complex.

**Delivers:**
- REST API with `/events` endpoint
- Server-side filtering (date, genre, venue, artist)
- Database indexes on filter columns
- Pagination support
- Health check endpoint
- Testing with production-like data volume

**Addresses features:**
- Date-based filtering (API level)
- Genre filtering (API level)
- Venue filtering (API level)
- Search functionality (API level)

**Avoids pitfalls:**
- Client-side filtering on full dataset (server-side from day 1)
- Performance at scale (indexes and pagination upfront)
- Missing data validation (Zod schema validation at API boundary)

**Research flag:** Phase 2 can skip research—standard REST API patterns, well-documented

---

### Phase 3: Calendar UI & User Experience
**Rationale:** With API serving validated data, build UI for browsing/filtering. Defer calendar grid view complexity—start with simpler list view to validate UX patterns. Mobile-first design is non-negotiable (60%+ traffic). Virtual rendering must be implemented from the start for 12-month window.

**Delivers:**
- List view (chronological event listing)
- Filter UI (date picker, genre/venue dropdowns)
- Search input with debounced API calls
- Event detail modal/page
- Mobile-responsive design (Tailwind)
- Loading states and error handling
- Ticket purchase deep links

**Addresses features:**
- List view (defer calendar grid to Phase 4)
- Mobile-responsive design
- Ticket purchase links
- Search functionality (UI layer)

**Avoids pitfalls:**
- 12-month performance nightmare (virtual rendering + lazy loading)
- No loading states (skeleton loaders from start)
- Poor mobile experience (mobile-first Tailwind implementation)

**Research flag:** Phase 3 can skip research—standard React patterns, React Big Calendar well-documented

---

### Phase 4: Multi-Platform Aggregation & Production Hardening
**Rationale:** With single platform validated (Phase 1-3), scale to AXS and DICE. Each platform needs custom scraper but shares normalization/deduplication pipeline. This phase proves deduplication works across platforms and tests monitoring under production load.

**Delivers:**
- AXS scraper (Playwright)
- DICE scraper (Playwright)
- Cross-platform deduplication testing
- Job queue migration (Vercel Cron → BullMQ if needed)
- Retry logic and exponential backoff
- Structured logging and observability
- Production deployment

**Addresses features:**
- Comprehensive aggregation (3 platforms)
- 12-month rolling window (daily updates maintain window)

**Avoids pitfalls:**
- Scraper failures block all platforms (separate workers per platform)
- Rate limit issues (exponential backoff implemented)
- No scraper versioning (version tracking added)

**Research flag:** Phase 4 needs `/gsd:research-phase` for AXS and DICE scraping specifics (each platform has unique anti-bot measures)

---

### Phase 5: Enhancement & Calendar Grid View
**Rationale:** Only after core aggregation works (Phases 1-4) and traffic validates product-market fit (target: 1K+ weekly users), add calendar grid view and advanced features. These are differentiators but not blockers for launch.

**Delivers:**
- Calendar grid view (month/week) with React Big Calendar
- Advanced filtering combinations (genre + venue + date)
- Genre taxonomy with subgenres
- Calendar export (iCal)
- Venue capacity information
- Trending/popularity indicators

**Addresses features:**
- Calendar views (month/week/day)
- Advanced filtering
- Calendar export
- All "Should have" differentiators

**Avoids pitfalls:**
- Calendar performance nightmare (virtual rendering maintained)
- Genre taxonomy inconsistency (normalization layer handles)

**Research flag:** Phase 5 can skip research—React Big Calendar integration is well-documented, iCal format is standard

---

### Phase Ordering Rationale

- **Phases 1-2 validate core technical risk**: Can we reliably scrape and deduplicate events? This is the highest risk and must be proven before UI investment. Single platform scope keeps complexity low while testing assumptions.

- **Phase 3 validates user experience**: With API serving real data, test if users can discover events effectively. List view is simpler than calendar grid, gets user feedback faster. Mobile-first because 60%+ traffic will be mobile.

- **Phases 4-5 scale proven patterns**: Only after single platform works, add more sources. Only after basic UI works, add advanced views. This incremental approach prevents premature optimization and scope creep.

- **Critical dependencies respected**: Database schema (Phase 1) → API (Phase 2) → UI (Phase 3) → Multi-platform (Phase 4) → Enhancements (Phase 5). Each phase depends on previous completing. Parallel work is minimal.

- **Deduplication comes early**: Phase 1 implements deduplication with single platform to validate logic. Phase 4 tests it across platforms. Deferring deduplication to Phase 4 would require reprocessing all Phase 1-3 data.

### Research Flags

Phases needing deeper research during planning:
- **Phase 1:** Ticketmaster SE API availability, Terms of Service review, scraping strategy (API vs browser automation), rate limits, anti-bot measures specific to Ticketmaster
- **Phase 4:** AXS and DICE scraping strategies (each platform has unique anti-bot systems), proxy requirements, rate limit thresholds

Phases with standard patterns (skip research-phase):
- **Phase 2:** REST API implementation with filtering/pagination (standard Next.js patterns)
- **Phase 3:** Calendar UI with React Big Calendar (well-documented, 743K weekly downloads)
- **Phase 5:** iCal export (standard RFC 5545), calendar grid view (established patterns)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core technologies verified with official docs and release notes (Next.js 15, Prisma 7, Playwright 1.58, TypeScript 5.8). Web scraping ecosystem validated across multiple 2026 industry sources. |
| Features | MEDIUM | Based on competitor analysis (Songkick, Bandsintown) and multiple event platform sources. Table stakes features are well-established. Stockholm market sizing would benefit from additional validation. |
| Architecture | MEDIUM | Architectural patterns validated across multiple web sources and align with industry best practices. Modular monolith vs microservices decision backed by 2026 research. Specific scaling thresholds are estimates. |
| Pitfalls | MEDIUM-HIGH | Pitfalls verified across web scraping best practices (2026 sources), deduplication patterns, and calendar UI performance issues. Ticketmaster-specific pitfalls validated against official API docs and scraping guides. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

Research was comprehensive but has areas needing validation during implementation:

- **Stockholm venue taxonomy**: Research didn't uncover definitive list of Stockholm music venues. Need to compile during Phase 1 from scraping results and validate against local knowledge.

- **Genre classification depth**: How many genre categories are needed? Research suggests 5-10 core genres but Stockholm-specific breakdown (is "Electronic" sufficient or should it split to Techno/House/Trance?) needs user validation.

- **Ticketmaster API coverage**: Official Ticketmaster Discovery API exists but research didn't confirm if it covers 100% of events shown on website. May need hybrid approach (API primary, scraping fallback for gaps). Validate in Phase 1 research.

- **AXS/DICE API availability**: Research focused on Ticketmaster. AXS and DICE may have APIs that weren't uncovered. Phase 4 research should prioritize API discovery over scraping.

- **Actual scraping feasibility**: All research assumes scraping is technically possible, but anti-bot systems are constantly evolving. Phase 1 will reveal if Playwright + Crawlee can reliably bypass protections. Have fallback plan (proxy services, headless browser services like Browserless.io) if basic approach fails.

- **Deduplication accuracy threshold**: Research recommends >95% accuracy but doesn't provide benchmark datasets. Create test dataset of known duplicates during Phase 1 to measure and tune deduplication algorithm.

## Sources

### Primary (HIGH confidence)
- Next.js 15 Release Notes — Core framework features, React 19 support, App Router
- Prisma 7 Announcement — Performance improvements, Rust-free client
- Playwright npm (v1.58.2) — Browser automation capabilities
- TypeScript 5.8 Release — Latest stable features
- Tailwind CSS v4 — Performance gains, CSS-first config
- Ticketmaster Developer Portal — API documentation and ToS

### Secondary (MEDIUM confidence - multiple sources agree)
- Web Scraping Best Practices 2026 (ScrapingBee, ZenRows, PromptCloud, ScrapeHero)
- Event Aggregation Architecture (Confluent, Gravitee, Estuary)
- Calendar System Architecture (Google Calendar backend analysis, Oracle docs)
- Deduplication Strategies (Medium, Architecture Weekly, Domain Centric)
- Anti-Bot Systems (Medium, ZenRows, WebAutomation.io)
- Monolith vs Microservices 2026 (ByteByteGo, Binary Republik, Agile Soft Labs)
- Music Discovery Platforms (Songkick, Bandsintown analysis, multiple reviews)
- PostgreSQL vs MongoDB use cases (Seven Square Tech)
- React Big Calendar vs FullCalendar (Bryntum comparison)

### Tertiary (LOW confidence - needs validation)
- Stockholm market sizing (Songkick shows 405 current events — extrapolated to 400-600/month)
- Genre taxonomy depth (inferred from DSP guidelines, needs Stockholm-specific validation)
- Scalability thresholds (1K/10K/100K users) are estimates, not verified for this specific use case

---
*Research completed: 2026-02-20*
*Ready for roadmap: yes*
