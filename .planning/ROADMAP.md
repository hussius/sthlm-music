# Roadmap: Stockholm Music Events Calendar

## Overview

This roadmap takes the Stockholm Music Events Calendar from concept to public launch in three focused phases. Phase 1 builds the data foundation with multi-platform scraping, deduplication, and database infrastructure. Phase 2 creates the API layer with server-side filtering for date, genre, venue, and artist search. Phase 3 delivers the public-facing calendar UI with mobile-responsive design and ticket platform integration. Each phase validates core technical risks (can we reliably scrape and deduplicate?) before investing in the next layer, ensuring the product works end-to-end quickly rather than building in horizontal layers.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Data Foundation & Multi-Platform Aggregation** - Build scraping infrastructure for all 3 ticket platforms with deduplication
- [ ] **Phase 2: API Layer & Performance** - Create REST API with server-side filtering and pagination
- [ ] **Phase 3: Calendar UI & Public Launch** - Build mobile-responsive calendar with filters and ticket links

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
- [ ] 01-03-PLAN.md — Ticketmaster Discovery API crawler
- [x] 01-04-PLAN.md — AXS/Live Nation Playwright crawler
- [ ] 01-05-PLAN.md — DICE Playwright crawler
- [ ] 01-06-PLAN.md — Priority venue website crawlers (13 venues)
- [ ] 01-07-PLAN.md — Multi-stage deduplication engine (exact + fuzzy matching)
- [ ] 01-08-PLAN.md — Job scheduling with BullMQ (daily crawls, cleanup, monitoring)
- [ ] 01-09-PLAN.md — Gap closure: Implement ticket URL merging across duplicate events
- [ ] 01-10-PLAN.md — Gap closure: Reduce alert timing to meet 5-minute requirement

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
**Plans**: TBD

Plans:
- [ ] TBD after phase planning

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
**Plans**: TBD

Plans:
- [ ] TBD after phase planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Foundation & Multi-Platform Aggregation | 3/10 | In progress (gap closure pending) | - |
| 2. API Layer & Performance | 0/TBD | Not started | - |
| 3. Calendar UI & Public Launch | 0/TBD | Not started | - |
