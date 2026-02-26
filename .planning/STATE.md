# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** Comprehensive event coverage - capture all Stockholm music events in one place so people don't miss shows scattered across multiple platforms.
**Current focus:** Phase 3 - Calendar UI & Public Launch

## Current Position

Phase: 3 of 3 (Calendar UI & Public Launch)
Plan: 3 of 3 in current phase
Status: Complete
Last activity: 2026-02-20 — Completed 03-03-PLAN.md (Comprehensive Filtering UI with URL State Management)

Progress: [██████████] 100% (Phase 3: 3 of 3 complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: 15.5 minutes
- Total execution time: 3.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 01 | 9 | 194 min | 21.6 min |
| Phase 02 | 4 | 11 min | 2.8 min |

**Recent Plans:**
| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P04 | 3 min | 2 | 2 |
| Phase 01 P05 | 5 min | 2 | 2 |
| Phase 01 P06 | 4 min | 3 | 17 |
| Phase 01 P07 | 4 min | 2 | 5 |
| Phase 01 P09 | 128 min | 2 | 8 |
| Phase 01 P10 | 2 min | 1 | 2 |
| Phase 02 P01 | 3 min | 3 | 5 |
| Phase 02 P02 | 2 min | 2 | 2 |
| Phase 02 P03 | 2 min | 3 | 5 |
| Phase 02 P04 | 4 min | 3 | 4 |
| Phase 03 P01 | 3 | 3 tasks | 21 files |
| Phase 03 P03 | 3 | 3 tasks | 8 files |
| Phase 03 P02 | 4 | 3 tasks | 3 files |
| Phase 05-wire-scheduling-deduplication-pipeline P01 | 1 | 1 tasks | 1 files |
| Phase 05-wire-scheduling-deduplication-pipeline P02 | 5 | 2 tasks | 5 files |
| Phase 06-fix-calendar-ui-gaps P01 | 20 | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- No authentication for v1 — lower barrier to adoption, faster to build
- 12-month rolling window — focus on near-term planning, manageable data scope
- 3 platforms for v1 — balance comprehensiveness with implementation complexity
- Link to platforms for tickets — avoid payment processing complexity
- Use Drizzle ORM over Prisma — better TypeScript inference and SQL control (01-01)
- Use ES modules — modern Node.js patterns with cleaner imports (01-01)
- Connection pool max 10 — suitable for crawler workload (01-01)
- Unique index on (venue, date) — exact match deduplication strategy (01-01)
- 11 canonical genres with 'other' fallback — balance specificity and maintainability (01-02)
- Date validation requires future dates — catches parsing errors and wrong timezones early (01-02)
- Venue normalization as Zod transform — automatic for all events, enables exact match deduplication (01-02)
- Platform transformers delegate validation — separation of extraction logic from validation logic (01-02)
- Multiple selector fallbacks instead of hardcoded selectors — resilience to page structure changes (01-04)
- Default relative dates to 8 PM — sensible default when specific time unavailable (01-04)
- Skip TBA/TBD dates rather than parsing — prevents validation errors for unparseable dates (01-04)
- Use repositories/ directory instead of storage/ — storage/ reserved for Crawlee file storage (01-04)
- Limit scroll attempts to 20 — prevents infinite loops if DICE page structure changes (01-05)
- Network-idle with 2s fallback — faster than fixed timeouts while ensuring progress (01-05)
- DEBUG mode via environment variable — troubleshooting without code changes (01-05)
- Enhanced date parsing for club events — handles ISO, relative, and 'FRI 15 JUN' formats (01-05)
- [Phase 01]: Placeholder selectors require manual refinement - each venue has unique HTML structure
- [Phase 01]: Health checks based on event count in last 30 days assuming weekly crawls
- [Phase 01]: Sequential venue crawling to avoid overwhelming small venue websites
- [Phase 01]: VenueConfig pattern enables easy selector updates when venue sites change
- Use token_set_ratio over simple Levenshtein for word order insensitivity (01-07)
- Weighted similarity: 60% artist, 40% event name for fuzzy matching (01-07)
- Deduplication thresholds: >90/85 = duplicate, >75/70 = manual review (01-07)
- 24-hour window for fuzzy matching handles timezone differences (01-07)
- Save events immediately even if queued for manual review (01-07)
- Alert immediately on first failure rather than after all retries — humans notified early while system recovers automatically (01-10)
- Reduced retry attempts (3→2) and backoff (60s→30s) — faster recovery or escalation (01-10)
- Include retry count in alerts — provides context about system state (01-10)
- JSONB array for ticket sources over separate table — simpler queries (no JOIN), typical event has 1-3 sources, avoids N+1 problem (01-09)
- Deduplicate ticket sources by platform — same platform keeps existing URL, different platform adds to array (01-09)
- Automatic ticket source merging on duplicate — seamless UX, users see all platform options (01-09)
- Timestamp tracking per ticket source — addedAt field tracks when platform discovered (01-09)
- Use Fastify 5.x over Express for 2-3x better JSON performance (02-01)
- Use fastify-type-provider-zod for single source of truth validation (02-01)
- Monitor response times with onRequest/onResponse hooks using perf_hooks (02-01)
- Log slow requests >200ms to validate performance target (02-01)
- Security-first middleware order: helmet → cors → response-time → routes (02-01)
- Use GIN trigram indexes over full-text search for simpler query patterns with existing text columns (02-02)
- Cursor-based pagination with composite key (date, id) for consistent ordering and O(1) performance (02-02)
- Repository exports singleton instance for convenience while maintaining testability (02-02)
- Select all columns for API completeness rather than subset projection (02-02)
- Zod schemas provide single source of truth for validation and TypeScript types (02-03)
- Layered architecture separates HTTP concerns (controller) from business logic (service) from data access (repository) (02-03)
- Controller binds methods to preserve 'this' context when passed to Fastify routes (02-03)
- Service layer validates limit bounds before calling repository (02-03)
- Batch insertion (100 events per batch) prevents memory issues during large dataset seeding (02-04)
- 500 artist pool with mix of real bands and generated names provides realistic load test variety (02-04)
- 7 query patterns cover all API filter types for comprehensive load testing (02-04)
- EXPLAIN ANALYZE verification catches performance regressions by detecting sequential scans (02-04)
- Performance validation scripts exit with error code 1 when targets not met for CI/CD integration (02-04)
- [Phase 03]: Vite React TypeScript app with TanStack Query infinite scroll and Stockholm timezone formatting (03-01)
- [Phase 03]: TanStack Query with 60s staleTime for efficient data caching (03-01)
- [Phase 03]: Proxy /api requests through Vite dev server to avoid CORS in development (03-01)
- [Phase 03]: Stockholm timezone (Europe/Stockholm) for all date displays using date-fns-tz (03-01)
- [Phase 03]: URL search params as single source of truth for filter state - enables shareable and bookmark-able filtered views (03-03)
- [Phase 03]: 300ms debounce delay for search inputs - balance between responsiveness and API load (03-03)
- [Phase 03]: Separate immediate input state from debounced state - input feels instant while API calls are throttled (03-03)
- [Phase 03]: Genre and venue filters update immediately without debouncing - dropdowns don't need throttling (03-03)
- [Phase 05-01]: Scheduling startup errors are caught and logged without rethrowing — API starts even if Redis is unavailable
- [Phase 05-01]: Scheduling try/catch is separate from server startup try/catch — Redis failure cannot prevent HTTP server from starting
- [Phase 05-02]: Create manual migration SQL file when db:generate requires interactive input (ticket_url to ticket_sources rename prompt)
- [Phase 05-02]: Crawlers call deduplicateAndSave() not upsertEvent() directly - deduplicator owns DB write responsibility
- [Phase 06-01]: EventCard no longer navigates directly to ticket URL — modal handles all ticket interactions
- [Phase 06-01]: selectedEvent state lives in EventList (not App or context) — modal is scoped to the list

### Roadmap Evolution

- Phase 4 added: Crawler Expansion & Coverage Enhancement (2026-02-21)

### Pending Todos

1. **Expand crawler coverage with new APIs and venues** (crawlers)
   - Fix Nalen scraper (no hits) and verify Kollektivet Livet coverage
   - Integrate Tickster API (pending key) and evaluate Eventbrite API
   - Add 20+ venue scrapers: Gamla Enskede Bryggeri, Gröna Lund, Cirkus, Kraken, Göta Lejon, Rosettas, Slakthuset, Yttons, Alcazar, Tre Backar, Tranan, Konserthuset, Snövit, Cafe 44, Kolingsborg, Fryshuset, Klubben, Studion, Sofia Common, Fredagsmangel
   - See: .planning/todos/pending/2026-02-21-expand-crawler-coverage-with-new-apis-and-venues.md

3. **Berns venue filter returns empty set** (crawlers)
   - Selecting Berns in dropdown returns empty — unclear if scraper failed or canonical name mismatch
   - See: .planning/todos/pending/2026-02-25-berns-venue-filter-returns-empty-set.md

4. **Filter out non-concert entries from event data** (api)
   - Crawlers ingest non-music entries like "presentkort" (gift cards), "quiz", etc.
   - Implement event name blocklist at normalization layer + enforce Ticketmaster `classificationName: "Music"`
   - See: .planning/todos/pending/2026-02-25-filter-out-non-concert-entries-from-event-data.md

4. **Tag events with organizer for organizer filtering** (api)
   - Organizers like Klubb Död and Jazz är Farligt host events at multiple/rotating venues
   - Add organizer field to schema, extract from crawlers where available, add filter to API + UI
   - See: .planning/todos/pending/2026-02-25-tag-events-with-organizer-for-organizer-filtering.md

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-26 (plan execution)
Stopped at: Completed 06-01-PLAN.md (Wire EventModal into EventList via EventCard click handlers)
Resume file: None
