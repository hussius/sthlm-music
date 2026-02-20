# Deferred Items - Phase 01

Items discovered during plan execution that are out of scope and require separate attention.

## Pre-existing Type Errors (Discovered during 01-10)

**Context:** Found during build verification in 01-10-PLAN.md execution. These errors existed before the plan changes and are not related to the alert timing modifications.

**Errors:**

1. **src/crawlers/axs.ts:334** - Missing ticketSources property
2. **src/crawlers/dice.ts:202** - Missing ticketSources property
3. **src/crawlers/ticketmaster.ts:105** - Missing ticketSources property
4. **src/crawlers/venues/base-venue-crawler.ts:166** - Missing genre property
5. **src/crawlers/venues/base-venue-crawler.ts:168** - Missing price property
6. **src/crawlers/venues/base-venue-crawler.ts:182** - Type mismatch for AdditionalData
7. **src/scheduling/monitoring.ts:63** - job.id can be null/undefined, needs type guard

**Impact:** Build fails but functionality works at runtime (TypeScript strictness issue).

**Recommendation:** Create follow-up plan to fix type errors across crawler files and add proper type guards in monitoring.ts.
