# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** Comprehensive event coverage - capture all Stockholm music events in one place so people don't miss shows scattered across multiple platforms.
**Current focus:** Phase 2 - API Layer & Performance

## Current Position

Phase: 2 of 3 (API Layer & Performance)
Plan: 2 of 4 in current phase
Status: In progress
Last activity: 2026-02-20 — Completed 02-01-PLAN.md (API Server Foundation)

Progress: [█████░░░░░] 50%

## Performance Metrics

**Velocity:**
- Total plans completed: 11
- Average duration: 18.3 minutes
- Total execution time: 3.32 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 01 | 9 | 194 min | 21.6 min |
| Phase 02 | 2 | 5 min | 2.5 min |

**Recent Plans:**
| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 5 min | 3 | 11 |
| Phase 01 P02 | 6 min | 3 | 3 |
| Phase 01 P04 | 3 min | 2 | 2 |
| Phase 01 P05 | 5 min | 2 | 2 |
| Phase 01 P06 | 4 min | 3 | 17 |
| Phase 01 P07 | 4 min | 2 | 5 |
| Phase 01 P09 | 128 min | 2 | 8 |
| Phase 01 P10 | 2 min | 1 | 2 |
| Phase 02 P02 | 2 min | 2 | 2 |
| Phase 02 P01 | 3 min | 3 | 5 |

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

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-20 (plan execution)
Stopped at: Completed 02-01-PLAN.md (API Server Foundation)
Resume file: None
