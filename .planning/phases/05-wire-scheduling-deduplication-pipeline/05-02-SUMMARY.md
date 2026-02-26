---
phase: 05-wire-scheduling-deduplication-pipeline
plan: 02
subsystem: database
tags: [deduplication, crawlers, drizzle, postgresql, migration]

# Dependency graph
requires:
  - phase: 05-01
    provides: Scheduling startup wired into src/index.ts (createWorker, setupCrawlJobs, setupCleanupJob)
  - phase: 01-07
    provides: 3-stage deduplication pipeline in src/deduplication/ (exact-match, fuzzy-match, manual-review-queue)
provides:
  - All four TypeScript crawlers route through deduplicateAndSave() 3-stage pipeline instead of direct upsertEvent()
  - review_queue migration file (0002_add_review_queue.sql) for table creation on next deploy
affects:
  - crawlers
  - deduplication
  - event-repository

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Import deduplicateAndSave from deduplicator.js instead of upsertEvent from event-repository.js in all crawlers"
    - "Manual SQL migration file for environments where db:generate requires interactive input"

key-files:
  created:
    - src/db/migrations/0002_add_review_queue.sql
  modified:
    - src/crawlers/ticketmaster.ts
    - src/crawlers/axs.ts
    - src/crawlers/dice.ts
    - src/crawlers/venues/base-venue-crawler.ts

key-decisions:
  - "Create manual migration SQL file when db:generate requires interactive input (ticket_url→ticket_sources rename prompt)"
  - "Update stale JSDoc comments in base-venue-crawler.ts to reflect new deduplication pipeline (Rule 1 auto-fix)"

patterns-established:
  - "Crawlers call deduplicateAndSave() not upsertEvent() — deduplicator owns DB write responsibility"
  - "upsertEvent() remains in event-repository.ts as internal tool used by deduplicator, not by crawlers directly"

requirements-completed:
  - DATA-05
  - QUAL-01

# Metrics
duration: 5min
completed: 2026-02-25
---

# Phase 05 Plan 02: Wire Crawlers to Deduplication Pipeline Summary

**All four TypeScript crawlers now route events through the 3-stage fuzzy deduplication pipeline (exact match + token_set_ratio + manual review queue) instead of calling upsertEvent() directly**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-25T22:09:13Z
- **Completed:** 2026-02-25T22:14:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Replaced `upsertEvent` import and call with `deduplicateAndSave` in all four crawlers (ticketmaster.ts, axs.ts, dice.ts, base-venue-crawler.ts)
- Created `src/db/migrations/0002_add_review_queue.sql` so the `review_queue` table will be created on next deploy
- TypeScript compiles clean after all changes (`npx tsc --noEmit` exits 0)
- Cross-platform duplicate events (e.g., same concert on Ticketmaster AND DICE) will now be merged into one DB row with both ticket sources

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate review_queue table** - `b0bf112` (chore)
2. **Task 2: Replace upsertEvent with deduplicateAndSave** - `2872c68` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/db/migrations/0002_add_review_queue.sql` - CREATE TABLE review_queue DDL for fuzzy match "maybe" edge cases
- `src/crawlers/ticketmaster.ts` - Swapped upsertEvent import/call for deduplicateAndSave
- `src/crawlers/axs.ts` - Swapped upsertEvent import/call for deduplicateAndSave
- `src/crawlers/dice.ts` - Swapped upsertEvent import/call for deduplicateAndSave
- `src/crawlers/venues/base-venue-crawler.ts` - Swapped upsertEvent import/call for deduplicateAndSave + updated JSDoc comments

## Decisions Made

- Create manual migration SQL file when `db:generate` requires interactive input: `drizzle-kit generate` prompts about `ticket_url→ticket_sources` rename and cannot run non-interactively in this environment. Created `0002_add_review_queue.sql` manually from the schema definition.
- Update stale JSDoc comments in `base-venue-crawler.ts`: Two comments still referenced "upsertEvent" in documentation. Updated to "deduplicateAndSave" for accuracy.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated stale JSDoc comments in base-venue-crawler.ts**
- **Found during:** Task 2 verification (grep check revealed 2 comment lines still referencing upsertEvent)
- **Issue:** Two JSDoc comments said "Saves to database via upsertEvent" and "4. Save via upsertEvent" — misleading after the import swap
- **Fix:** Updated both comments to reference deduplicateAndSave with pipeline description
- **Files modified:** src/crawlers/venues/base-venue-crawler.ts
- **Verification:** Re-ran grep — only import and call site lines contain "deduplicateAndSave", no functional upsertEvent references remain
- **Committed in:** 2872c68 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - stale documentation)
**Impact on plan:** Minor documentation fix only. No logic changes beyond the planned import/call swaps.

## Issues Encountered

- `npm run db:push` failed with EPERM (database not running in sandbox environment) — expected, fell back to manual migration file creation as per plan's fallback instructions
- `npm run db:generate` requires interactive input (prompts about ticket_url→ticket_sources column rename) — non-interactive environment cannot respond; created migration SQL manually from schema.ts

## User Setup Required

None - no external service configuration required. The migration file `0002_add_review_queue.sql` will be applied automatically on next deploy via `npm run db:migrate`.

## Next Phase Readiness

- All four TypeScript crawlers now active on the 3-stage deduplication pipeline
- `review_queue` table will be created on next `npm run db:migrate` (or `db:push` when DB is available)
- DATA-05 satisfied: deduplication pipeline active across all crawler sources
- QUAL-01 satisfied: 3-stage fuzzy deduplication (exact match + token_set_ratio + manual review) active with pre-tuned thresholds
- Ready for Phase 05 Plan 03 if applicable

## Self-Check: PASSED

- FOUND: src/db/migrations/0002_add_review_queue.sql
- FOUND: src/crawlers/ticketmaster.ts (deduplicateAndSave wired)
- FOUND: src/crawlers/axs.ts (deduplicateAndSave wired)
- FOUND: src/crawlers/dice.ts (deduplicateAndSave wired)
- FOUND: src/crawlers/venues/base-venue-crawler.ts (deduplicateAndSave wired)
- FOUND commit b0bf112: chore(05-02): add review_queue migration file
- FOUND commit 2872c68: feat(05-02): wire crawlers to use deduplication pipeline
- TypeScript: PASS (npx tsc --noEmit exits 0)

---
*Phase: 05-wire-scheduling-deduplication-pipeline*
*Completed: 2026-02-25*
