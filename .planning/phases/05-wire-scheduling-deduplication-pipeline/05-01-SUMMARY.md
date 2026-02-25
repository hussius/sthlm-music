---
phase: 05-wire-scheduling-deduplication-pipeline
plan: 01
subsystem: infra
tags: [bullmq, redis, scheduling, crawlers]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: BullMQ worker and job scheduling infrastructure in src/scheduling/
provides:
  - Application entry point that launches BullMQ worker and registers all repeating crawl and cleanup jobs at startup
affects: [05-wire-scheduling-deduplication-pipeline, crawlers, infra]

# Tech tracking
tech-stack:
  added: []
  patterns: [Scheduling startup wrapped in non-fatal try/catch so Redis unavailability never blocks API server]

key-files:
  created: []
  modified: [src/index.ts]

key-decisions:
  - "Scheduling startup errors are caught and logged without rethrowing — API starts even if Redis is unavailable"
  - "Scheduling try/catch is inside main() but after server.listen() succeeds — server startup failure is independent of scheduling failure"

patterns-established:
  - "Non-fatal infrastructure wiring: wrap optional subsystem startup in its own try/catch, log errors, never rethrow"

requirements-completed: [DATA-01, DATA-02, DATA-03, DATA-04, DATA-06]

# Metrics
duration: 1min
completed: 2026-02-25
---

# Phase 05 Plan 01: Wire Scheduling Startup Summary

**BullMQ worker and daily/weekly crawl jobs wired into src/index.ts so crawlers execute automatically on schedule at startup**

## Performance

- **Duration:** < 1 min
- **Started:** 2026-02-25T21:55:41Z
- **Completed:** 2026-02-25T21:56:16Z
- **Tasks:** 1 of 1
- **Files modified:** 1

## Accomplishments
- Imported `setupCrawlJobs` and `setupCleanupJob` from `src/scheduling/jobs.ts` into `src/index.ts`
- Imported `createWorker` from `src/scheduling/processors.ts` into `src/index.ts`
- Called all three functions after `server.listen()` succeeds, wrapped in a try/catch that logs but does not rethrow
- Crawlers (Ticketmaster at 3 AM, AXS at 3:15 AM, DICE at 3:30 AM, venues at 4 AM) and cleanup (Sunday 4 AM) now register automatically on application startup

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire scheduling startup into src/index.ts** - `ce7d8dd` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/index.ts` - Added scheduling imports and startup try/catch after server.listen()

## Decisions Made
- Scheduling startup errors are caught and logged without rethrowing — the API should serve requests even when Redis is unavailable
- The scheduling try/catch is separate from (and nested inside) the outer try/catch that wraps server startup, so a Redis failure cannot prevent the HTTP server from starting

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Scheduling is now live: when the application starts with a working Redis connection, all crawl and cleanup jobs are registered automatically
- Next plan in phase 05 can proceed to deduplication pipeline work
- Redis must be running for scheduling to activate; API operates normally without it

---
*Phase: 05-wire-scheduling-deduplication-pipeline*
*Completed: 2026-02-25*
