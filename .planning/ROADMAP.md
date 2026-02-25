# Roadmap: Stockholm Music Events Calendar

## Overview

This roadmap takes the Stockholm Music Events Calendar from concept to public launch in three focused phases. Phase 1 builds the data foundation with multi-platform scraping, deduplication, and database infrastructure. Phase 2 creates the API layer with server-side filtering for date, genre, venue, and artist search. Phase 3 delivers the public-facing calendar UI with mobile-responsive design and ticket platform integration. Each phase validates core technical risks (can we reliably scrape and deduplicate?) before investing in the next layer, ensuring the product works end-to-end quickly rather than building in horizontal layers.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Data Foundation & Multi-Platform Aggregation** - Build scraping infrastructure for all 3 ticket platforms with deduplication (completed 2026-02-21)
- [x] **Phase 2: API Layer & Performance** - Create REST API with server-side filtering and pagination (completed 2026-02-20)
- [x] **Phase 3: Calendar UI & Public Launch** - Build mobile-responsive calendar with filters and ticket links (completed 2026-02-20)

## Phase Details

### Phase 1: Data Foundation & Multi-Platform Aggregation
**Goal**: System reliably crawls all three ticket platforms daily and stores deduplicated events in database
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, QUAL-01
**Success Criteria** (what must be TRUE):
  1. System crawls Ticketmaster SE, AXS/Live Nation, and DICE daily without manual intervention
  2. Events from all sources appear in database with normalized schema (venue, date, genre, artist)
  3. Duplicate events across platforms are merged into single entries with multiple ticket links
  4. Database contains only events within 12-month rolling window (older events automatically removed)
  5. Scraper failures trigger alerts within 5 minutes of detection
**Plans**: 10 plans across 1 wave (8 standard + 2 gap closure)

Plans:
- [x] 01-01-PLAN.md — Database & crawler infrastructure (Node.js, PostgreSQL, Drizzle)
- [x] 01-02-PLAN.md — Data normalization layer (Zod schemas, venue/genre mappings)
- [x] 01-03-PLAN.md — Ticketmaster Discovery API crawler
- [x] 01-04-PLAN.md — AXS/Live Nation Playwright crawler
- [x] 01-05-PLAN.md — DICE Playwright crawler
- [x] 01-06-PLAN.md — Priority venue website crawlers (13 venues)
- [x] 01-07-PLAN.md — Multi-stage deduplication engine (exact + fuzzy matching)
- [x] 01-08-PLAN.md — Job scheduling with BullMQ (daily crawls, cleanup, monitoring)
- [x] 01-09-PLAN.md — Gap closure: Implement ticket URL merging across duplicate events
- [x] 01-10-PLAN.md — Gap closure: Reduce alert timing to meet 5-minute requirement

### Phase 2: API Layer & Performance
**Goal**: API serves filtered event data with sub-200ms response times for any query
**Depends on**: Phase 1
**Requirements**: FILT-01, FILT-02, FILT-03, FILT-04, FILT-05, PERF-01, PERF-02
**Success Criteria** (what must be TRUE):
  1. API endpoint returns events filtered by date range within 200ms
  2. API endpoint returns events filtered by genre within 200ms
  3. API endpoint returns events filtered by venue within 200ms
  4. API endpoint returns events matching artist/event name search within 200ms
  5. API handles database with 10,000+ events without performance degradation
**Plans**: 4 plans across 3 waves

Plans:
- [x] 02-01-PLAN.md — Fastify server foundation with response time monitoring
- [x] 02-02-PLAN.md — GIN trigram indexes and events repository with comprehensive filtering
- [x] 02-03-PLAN.md — API layer (service, controller, routes) with Zod validation
- [x] 02-04-PLAN.md — Load testing with autocannon and performance validation

### Phase 3: Calendar UI & Public Launch
**Goal**: Public can browse Stockholm music events on mobile and desktop, click through to buy tickets
**Depends on**: Phase 2
**Requirements**: DISP-01, DISP-02, DISP-03, DISP-04, DISP-05, INTG-01, INTG-02
**Success Criteria** (what must be TRUE):
  1. User can view events in chronological list on mobile phone
  2. User sees event name, date, time, venue, genre, and ticket availability for each event
  3. User can apply filters (date/genre/venue/artist) and see results update immediately
  4. User can click event and be taken directly to ticket purchase page on original platform
  5. Calendar displays times in Stockholm local timezone (Europe/Stockholm)
**Plans**: 3 plans across 2 waves

Plans:
- [x] 03-01-PLAN.md — React app foundation with data fetching and infinite scroll
- [x] 03-02-PLAN.md — Event cards with Tailwind styling and ticket integration
- [x] 03-03-PLAN.md — Filter UI with URL state management and debounced search

### Phase 4: Crawler Expansion & Coverage Enhancement
**Goal**: Expand Stockholm music event coverage by adding 10+ venue-specific crawlers and integrating the Tickster ticketing platform API, growing the crawler fleet from 12 to 27+ active venues
**Depends on**: Phase 3
**Requirements**: none specified
**Success Criteria** (what must be TRUE):
  1. All newly added crawlers return >0 events when run against live venue websites
  2. All venues are accessible via venue filter in the calendar UI
  3. crawl-all.js orchestrates all active crawlers in sequence
  4. Berns crawler exists (JS-rendered site, 0 events acceptable as known limitation)
  5. Tickster integration ready pending API key delivery
**Plans**: 5 plans across 2 waves

Note: 7 additional crawlers were added ad-hoc during phase execution (Nalen, Konserthuset,
Fredagsmangel, Rosettas, Slakthusetclub, Gröna Lund, Geronimos FGT), bringing total active
crawlers to 27+.

Plans:
- [x] 04-01-PLAN.md — 5 new venue crawlers (Stampen, GEB, Reimersholme, Cirkus, Berns)
- [ ] 04-02-PLAN.md — Tickster API integration (blocked on API key)
- [ ] 04-03-PLAN.md — Göta Lejon Live Nation API + B-K Webflow crawlers
- [ ] 04-04-PLAN.md — Rival Bootstrap carousel + Under Bron fix
- [ ] 04-05-PLAN.md — Phase wrap-up (ROADMAP + STATE update)

### Phase 5: Wire Scheduling & Deduplication Pipeline
**Goal**: System automatically crawls all platforms daily and deduplicates events across sources
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, QUAL-01
**Gap Closure**: Closes gaps from v1.0 audit
**Success Criteria** (what must be TRUE):
  1. Application startup launches BullMQ worker and registers all crawl + cleanup jobs
  2. Each crawl job runs and stores events automatically without manual invocation
  3. 12-month rolling window cleanup job runs on schedule
  4. Crawlers call deduplicateAndSave() instead of upsertEvent() directly
  5. Cross-platform fuzzy deduplication is active and merges duplicate events
**Plans**: 2 plans across 2 waves

Plans:
- [ ] 05-01-PLAN.md — Wire worker startup and job registration into application entry point
- [ ] 05-02-PLAN.md — Wire crawlers to use deduplication pipeline instead of direct upsert

### Phase 6: Fix Calendar UI Gaps
**Goal**: Users can filter by genre, see full event details (artist, genre, ticket availability), and all venue filters return correct results
**Depends on**: Phase 3
**Requirements**: FILT-02, FILT-03, DISP-02, DISP-03
**Gap Closure**: Closes gaps from v1.0 audit
**Success Criteria** (what must be TRUE):
  1. Genre filter select is visible and functional in FilterBar
  2. Selecting a genre filters events to only that genre
  3. EventModal opens on event click and shows artist, genre, price, all ticket sources
  4. All venue filter options match canonical venue names stored in database
  5. Debug pagination banner removed from EventList

Plans:
- [ ] 06-01-PLAN.md — Re-enable EventModal and restore genre filter in FilterBar
- [ ] 06-02-PLAN.md — Fix venue filter option values to match Phase 1 canonical names

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Foundation & Multi-Platform Aggregation | 10/10 | Complete | 2026-02-21 |
| 2. API Layer & Performance | 4/4 | Complete | 2026-02-20 |
| 3. Calendar UI & Public Launch | 3/3 | Complete | 2026-02-20 |
| 4. Crawler Expansion & Coverage Enhancement | 1/5 | In Progress | - |
| 5. Wire Scheduling & Deduplication Pipeline | 1/2 | In Progress|  |
| 6. Fix Calendar UI Gaps | 0/2 | Not started | - |
