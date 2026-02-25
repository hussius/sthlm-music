# Phase 5: Wire Scheduling & Deduplication Pipeline - Research

**Researched:** 2026-02-25
**Domain:** BullMQ scheduling, deduplication pipeline wiring, TypeScript ES module integration
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | System crawls Ticketmaster SE daily for Stockholm music events | Wiring `setupCrawlJobs()` + `createWorker()` in `src/index.ts` activates the already-defined repeating job at 3:00 AM |
| DATA-02 | System crawls AXS/Live Nation daily for Stockholm music events | Same fix as DATA-01 — job already defined in `jobs.ts`, just needs call site |
| DATA-03 | System crawls DICE daily for Stockholm music events | Same fix as DATA-01 — job already defined in `jobs.ts`, just needs call site |
| DATA-04 | System crawls priority venue websites daily | Same fix as DATA-01 — `venues-daily` job already registered in `jobs.ts`; note the root-level crawl-all.js covers 27+ venues but is not integrated into BullMQ processor yet |
| DATA-05 | System deduplicates events across all sources (same event shown once) | Replace `upsertEvent()` with `deduplicateAndSave()` in all 4 crawler entry points (ticketmaster.ts, axs.ts, dice.ts, base-venue-crawler.ts) |
| DATA-06 | System maintains 12-month rolling window (events within next year only) | Wiring `setupCleanupJob()` activates the weekly Sunday 4 AM cleanup already defined in `jobs.ts` |
| QUAL-01 | Events are deduplicated with >95% accuracy (minimal false positives/negatives) | `deduplicateAndSave()` implements 3-stage pipeline (exact match → fuzzy token_set_ratio → manual review queue); thresholds already tuned (>90/85 = duplicate, >75/70 = manual review) |
</phase_requirements>

---

## Summary

Phase 5 is a pure **wiring phase** — all the machinery exists but is disconnected. The BullMQ scheduling infrastructure (`setupCrawlJobs()`, `setupCleanupJob()`, `createWorker()`) is fully implemented in `src/scheduling/jobs.ts` and `src/scheduling/processors.ts` but is never called from `src/index.ts`. The deduplication pipeline (`deduplicateAndSave()` in `src/deduplication/deduplicator.ts`) is fully implemented with 3-stage logic (exact match, fuzzy token_set_ratio, manual review queue) but has zero import sites outside its own module. Every TypeScript crawler calls `upsertEvent()` directly.

The scope is two surgical changes: (1) call `setupCrawlJobs()`, `setupCleanupJob()`, and `createWorker()` from `src/index.ts`; (2) replace `upsertEvent(normalized.data)` with `deduplicateAndSave(normalized.data)` in `ticketmaster.ts`, `axs.ts`, `dice.ts`, and `base-venue-crawler.ts`. There is an additional complexity: Phase 4 introduced 27+ standalone root-level `crawl-*.js` files that bypass the TypeScript module system entirely and use raw DB inserts. These are NOT hooked into BullMQ at all. The BullMQ processor routes the "venues" job to `crawlAllVenues()` which only covers the original 13 TypeScript venue crawlers.

**Primary recommendation:** Wire the three scheduling functions into `src/index.ts` (or a dedicated `src/worker.ts` entry point), then replace `upsertEvent()` with `deduplicateAndSave()` in the four TypeScript crawlers. Do not attempt to migrate the root-level `crawl-*.js` files into BullMQ in this phase — that is out of scope per the roadmap.

---

## Standard Stack

### Core (already in package.json — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| bullmq | 5.69.3 | Job queue with Redis-backed scheduling | Already installed; all job/worker code already written |
| ioredis | 5.9.3 | Redis client for BullMQ connection | Already installed; used in BullMQ connection config |
| fuzzball | 2.2.3 | Fuzzy string matching (token_set_ratio) | Already installed; powers deduplicator.ts Stage 2 |
| drizzle-orm | 0.45.1 | Database ORM for all DB operations | Already installed; used throughout |
| zod | 4.3.6 | Schema validation | Already installed |

**No new packages required.** All dependencies are installed.

### Architecture Already Built

| Module | Path | Status |
|--------|------|--------|
| Job queue definitions | `src/scheduling/jobs.ts` | Built, never called |
| Job processors + worker | `src/scheduling/processors.ts` | Built, never called |
| Cleanup job | `src/scheduling/cleanup.ts` | Built, never called |
| Deduplication orchestrator | `src/deduplication/deduplicator.ts` | Built, never imported |
| Exact match stage | `src/deduplication/exact-match.ts` | Built, works |
| Fuzzy match stage | `src/deduplication/fuzzy-match.ts` | Built, works |
| Manual review queue | `src/deduplication/manual-review-queue.ts` | Built, works |

---

## Architecture Patterns

### Current Entry Point (to be modified)

```
src/index.ts
├── buildServer()         ← Fastify HTTP server
└── server.listen()       ← starts API only
```

**Missing:**
```
setupCrawlJobs()         ← not called
setupCleanupJob()        ← not called
createWorker()           ← not called
```

### Pattern 1: Wiring Scheduling Into Startup

**What:** Call the three scheduling functions from `src/index.ts` after the server starts.

**When to use:** When the application is a monolith that combines API + background worker in one process. This is the simpler approach and appropriate here.

**Example (what to add to `src/index.ts`):**

```typescript
// Source: src/scheduling/jobs.ts, src/scheduling/processors.ts
import { setupCrawlJobs, setupCleanupJob } from './scheduling/jobs.js';
import { createWorker } from './scheduling/processors.js';

async function main() {
  try {
    const server = await buildServer();
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    await server.listen({ port, host: '0.0.0.0' });
    server.log.info(`Server listening at http://0.0.0.0:${port}`);

    // Start BullMQ worker and register repeating jobs
    const worker = createWorker();
    await setupCrawlJobs();
    await setupCleanupJob();

    server.log.info('Scheduling worker started, crawl jobs registered');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}
```

**Alternative: Separate worker entry point** (`src/worker.ts`)

If the API and worker should be separate processes (e.g., for independent scaling), create `src/worker.ts`:

```typescript
// src/worker.ts — run independently: tsx src/worker.ts
import { setupCrawlJobs, setupCleanupJob } from './scheduling/jobs.js';
import { createWorker } from './scheduling/processors.js';

async function startWorker() {
  const worker = createWorker();
  await setupCrawlJobs();
  await setupCleanupJob();
  console.log('Worker started. Listening for jobs...');
}

startWorker().catch((err) => {
  console.error('Worker startup failed:', err);
  process.exit(1);
});
```

**Recommendation:** Wire into `src/index.ts` (monolith approach) for simplicity since there's no current need for separate scaling. The planner can document the separate worker path as an alternative.

### Pattern 2: Replacing upsertEvent with deduplicateAndSave

**What:** In each TypeScript crawler, replace the direct `upsertEvent()` call with `deduplicateAndSave()`.

**Current pattern (bad — bypasses dedup):**

```typescript
// In ticketmaster.ts (line 110), axs.ts, dice.ts
import { upsertEvent } from '../repositories/event-repository.js';
// ...
await upsertEvent(normalized.data);
```

**New pattern (correct — uses dedup pipeline):**

```typescript
// Source: src/deduplication/deduplicator.ts
import { deduplicateAndSave } from '../deduplication/deduplicator.js';
// ...
await deduplicateAndSave(normalized.data);
```

**For base-venue-crawler.ts (line 186):**

```typescript
// Current: src/crawlers/venues/base-venue-crawler.ts line 186
import { upsertEvent } from '../../repositories/event-repository.js';
// Change to:
import { deduplicateAndSave } from '../../deduplication/deduplicator.js';
// ...
await deduplicateAndSave(normalized.data as any);
```

**Files requiring changes:**

| File | Line | Change |
|------|------|--------|
| `src/crawlers/ticketmaster.ts` | 17 + 110 | Replace import + call |
| `src/crawlers/axs.ts` | 23 + ~270 | Replace import + call |
| `src/crawlers/dice.ts` | 3 + ~180 | Replace import + call |
| `src/crawlers/venues/base-venue-crawler.ts` | 29 + 186 | Replace import + call |

### Pattern 3: Recommended Project Structure (no changes needed)

```
src/
├── index.ts              # Entry point — ADD scheduling wiring here
├── server.ts             # Fastify HTTP server
├── scheduling/
│   ├── jobs.ts           # Queue + job registration (already built)
│   ├── processors.ts     # Worker + job handlers (already built)
│   └── cleanup.ts        # 12-month window cleanup (already built)
├── deduplication/
│   ├── deduplicator.ts   # Orchestrator — deduplicateAndSave() (already built)
│   ├── exact-match.ts    # Stage 1: venue+date exact match
│   ├── fuzzy-match.ts    # Stage 2: fuzzball token_set_ratio
│   └── manual-review-queue.ts  # Stage 3: review queue
├── crawlers/
│   ├── ticketmaster.ts   # MODIFY: use deduplicateAndSave
│   ├── axs.ts            # MODIFY: use deduplicateAndSave
│   ├── dice.ts           # MODIFY: use deduplicateAndSave
│   └── venues/
│       ├── base-venue-crawler.ts  # MODIFY: use deduplicateAndSave
│       └── index.ts      # crawlAllVenues() — no changes needed
└── repositories/
    └── event-repository.ts  # upsertEvent() stays (still used by deduplicator.ts internally)
```

### Anti-Patterns to Avoid

- **Do NOT remove upsertEvent from event-repository.ts** — `deduplicateAndSave()` in `deduplicator.ts` calls `upsertEvent()` internally. Removing it would break the deduplication pipeline itself.
- **Do NOT try to wire the root-level `crawl-*.js` files into BullMQ in this phase** — these are standalone Node.js scripts that bypass the TypeScript module system. Migrating them is a separate concern and out of scope.
- **Do NOT add redis error handling that prevents server startup** — if Redis is unavailable, the API should still start; use try/catch around scheduling setup separately from server startup.
- **Do NOT call setupCrawlJobs() multiple times on restart** — BullMQ's `crawlQueue.add()` with a `jobId` is idempotent for repeating jobs; calling it multiple times with the same `jobId` is safe but confirm this behavior.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Job scheduling with cron | Custom cron + setTimeout | BullMQ (already installed) | Handles retries, distributed workers, monitoring, persistence |
| Fuzzy string deduplication | Levenshtein DIY | fuzzball token_set_ratio (already installed) | Handles word order, normalization |
| Redis connection pooling | Manual retry logic | BullMQ connection config (already set up) | BullMQ handles reconnection |
| Deduplication logic | New implementation | `deduplicateAndSave()` in deduplicator.ts | Already built and correct |

**Key insight:** Everything is already built. This phase is pure call-site wiring, not new implementation.

---

## Common Pitfalls

### Pitfall 1: BullMQ Worker Startup Before Redis is Ready

**What goes wrong:** If Redis is not running when `createWorker()` is called, the process crashes immediately with a connection error, taking down the API server too.

**Why it happens:** BullMQ connects to Redis eagerly on worker creation. If the application is starting in an environment where Redis is still initializing, the connection fails.

**How to avoid:** Wrap scheduling setup in a try/catch block that logs but does not throw. The API should still serve requests even if the worker fails to start.

```typescript
try {
  const worker = createWorker();
  await setupCrawlJobs();
  await setupCleanupJob();
  server.log.info('Scheduling worker started');
} catch (error) {
  server.log.error('Scheduling worker failed to start — crawls will not run automatically', error);
  // Do NOT rethrow — API should still work
}
```

**Warning signs:** Server fails to start with `ECONNREFUSED` or `Redis connection failed`.

### Pitfall 2: setupCrawlJobs() Registering Duplicate Repeating Jobs

**What goes wrong:** Every time the server starts, `crawlQueue.add()` is called with the same `jobId`. BullMQ 5.x with `jobId` on repeating jobs should deduplicate — but behavior must be verified.

**Why it happens:** The `jobId` field on `crawlQueue.add()` with `repeat` options acts as an idempotency key in BullMQ. If already exists, it updates rather than duplicates.

**How to avoid:** The current code uses `jobId: 'ticketmaster-daily'` etc. — this is correct. Verify by checking BullMQ 5.x docs that `jobId` on repeating jobs is idempotent.

**Warning signs:** Multiple scheduled executions at the same cron time after restart.

### Pitfall 3: deduplicateAndSave Type Signature Mismatch

**What goes wrong:** `deduplicateAndSave(event: NewEvent)` requires a `NewEvent` type. Crawlers may pass `normalized.data` which is typed differently after transformer output.

**Why it happens:** Transformers return a discriminated union `{ success: true, data: NormalizedEvent } | { success: false, errors: [] }`. The `data` type may not exactly match `NewEvent`.

**How to avoid:** Use `as any` cast on the call site if TypeScript complains — this is what `base-venue-crawler.ts` already does with `upsertEvent(normalized.data as any)`. Apply the same pattern.

**Warning signs:** TypeScript compilation errors after the import swap.

### Pitfall 4: crawlAllVenues() Only Covers 13 Original TypeScript Venues

**What goes wrong:** The BullMQ "venues-daily" job calls `crawlAllVenues()` from `src/crawlers/venues/index.ts` which only orchestrates the 13 original TypeScript venue crawlers. Phase 4 added 27+ additional crawlers as root-level `crawl-*.js` files — these will NOT run via the BullMQ schedule.

**Why it happens:** Phase 4 deliberately used standalone scripts rather than TypeScript modules for speed of implementation. The BullMQ processor was not updated.

**How to avoid:** This is a known architectural gap. Do not try to fix it in Phase 5. The success criteria only requires that "each crawl job runs and stores events automatically" — the 13 TypeScript venues satisfy this. The Phase 4 venues remain manually-invoked via `crawl-all.js`.

**Warning signs:** Expecting 27+ venues to run automatically but only 13 appear in scheduled logs.

### Pitfall 5: reviewQueue Table May Not Exist in Production DB

**What goes wrong:** `deduplicateAndSave()` calls `addToReviewQueue()` for "maybe" matches, which inserts into the `review_queue` table. If this table doesn't exist in the database (migration not run), the deduplication call will throw.

**Why it happens:** `cleanup.ts` already has a comment: "Note: reviewQueue table cleanup removed - table doesn't exist yet". This suggests the table may not be migrated.

**How to avoid:** Before wiring deduplicateAndSave, verify the `review_queue` table exists by running `db:migrate`. If it doesn't exist, the deduplication pipeline will crash on any "maybe" match.

**Warning signs:** Database errors referencing `review_queue` table after wiring.

---

## Code Examples

Verified patterns from the existing codebase:

### BullMQ Worker Creation (from src/scheduling/processors.ts)

```typescript
// Source: src/scheduling/processors.ts lines 107-136
export function createWorker() {
  const worker = new Worker(
    'event-crawls',
    async (job) => {
      if (job.name === 'cleanup') {
        return processCleanupJob(job);
      } else {
        return processCrawlJob(job);
      }
    },
    {
      connection: {
        host: new URL(config.REDIS_URL).hostname,
        port: parseInt(new URL(config.REDIS_URL).port) || 6379
      },
      concurrency: 1
    }
  );
  // ...
  return worker;
}
```

### Repeating Job Registration (from src/scheduling/jobs.ts)

```typescript
// Source: src/scheduling/jobs.ts lines 44-98
export async function setupCrawlJobs(): Promise<void> {
  await crawlQueue.add(
    'ticketmaster-crawl',
    { source: 'ticketmaster' },
    {
      repeat: { pattern: '0 3 * * *', tz: 'Europe/Stockholm' },
      jobId: 'ticketmaster-daily'
    }
  );
  // ... (axs at 3:15, dice at 3:30, venues at 4:00)
}
```

### deduplicateAndSave Usage (from src/deduplication/deduplicator.ts)

```typescript
// Source: src/deduplication/deduplicator.ts lines 127-171
// Full pipeline: exact match → fuzzy match → manual review → save
export async function deduplicateAndSave(event: NewEvent): Promise<Event> {
  const result = await deduplicateEvent(event);
  switch (result.status) {
    case 'duplicate':
      // Fetch + merge ticket sources, then upsert
    case 'unique':
      // Direct upsert
    case 'manual_review':
      // Upsert + add to review queue
  }
}
```

### Minimal wiring change for ticketmaster.ts

```typescript
// BEFORE (line 17):
import { upsertEvent } from '../repositories/event-repository.js';
// AFTER:
import { deduplicateAndSave } from '../deduplication/deduplicator.js';

// BEFORE (line 110):
await upsertEvent(normalized.data);
// AFTER:
await deduplicateAndSave(normalized.data);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| BullMQ 3.x job options API | BullMQ 5.x — `repeat.pattern` still works, `tz` field supported | BullMQ 4.x+ | No API change needed; existing code is correct |
| Separate `setInterval` scheduling | BullMQ repeating jobs with Redis persistence | Phase 1 | Jobs survive restarts, run on schedule even after downtime |

**Note on BullMQ 5.x:** The installed version is 5.69.3. The existing `jobs.ts` code uses `repeat: { pattern: '...', tz: '...' }` which is the correct API for BullMQ 5.x. No API updates needed.

---

## Open Questions

1. **Should scheduling run in same process as API or separate worker?**
   - What we know: `src/index.ts` starts only the API. BullMQ can run worker in same process.
   - What's unclear: Whether production deployment needs separate scaling of API vs workers.
   - Recommendation: Wire into `src/index.ts` for now (monolith approach). Create `src/worker.ts` as alternative only if deployment requires it. Phase 5 roadmap has only `05-01-PLAN.md` targeting this.

2. **Does review_queue table exist in the database?**
   - What we know: `cleanup.ts` has a comment "reviewQueue table cleanup removed - table doesn't exist yet"
   - What's unclear: Whether the migration for `review_queue` was ever run
   - Recommendation: Plan must include verification step: run `drizzle-kit push` or `drizzle-kit migrate` and verify table exists before running with deduplicateAndSave.

3. **Do the Phase 4 root-level crawl-*.js files need to be registered with BullMQ?**
   - What we know: Phase 5 success criteria says "each crawl job runs and stores events automatically" — the processors.ts currently routes to only 4 crawlers (ticketmaster, axs, dice, crawlAllVenues). Phase 4 venues are not in processors.
   - What's unclear: Whether "crawl jobs" means all 27+ venues or just the original 4 BullMQ job types.
   - Recommendation: Phase 5 success criteria item 2 says "each crawl job" — this refers to the 4 BullMQ job types (ticketmaster, axs, dice, venues). The Phase 4 venues are separate operational concern. Do not expand scope.

---

## Sources

### Primary (HIGH confidence)

- Direct source code inspection: `src/index.ts`, `src/scheduling/jobs.ts`, `src/scheduling/processors.ts`, `src/scheduling/cleanup.ts` — confirmed zero call sites for scheduling functions
- Direct source code inspection: `src/deduplication/deduplicator.ts`, `src/crawlers/ticketmaster.ts`, `src/crawlers/axs.ts`, `src/crawlers/dice.ts`, `src/crawlers/venues/base-venue-crawler.ts` — confirmed deduplication bypassed
- `package.json` — confirmed bullmq@5.69.3, fuzzball@2.2.3, all dependencies installed
- `src/db/schema.ts` — confirmed reviewQueue table in schema definition
- `src/scheduling/cleanup.ts` comment — "reviewQueue table cleanup removed - table doesn't exist yet"

### Secondary (MEDIUM confidence)

- `v1.0-MILESTONE-AUDIT.md` — independent audit confirming all gap findings match code inspection

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries needed, all dependencies verified in package.json
- Architecture: HIGH — source code fully inspected, exact line numbers identified for changes
- Pitfalls: HIGH — deduced from direct code analysis, not speculation
- review_queue migration status: MEDIUM — code comment suggests it may not be migrated; requires verification during execution

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable architecture, no external API dependencies for this phase)

---

## Key Files to Modify (Summary)

| File | Type of Change | Specific Change |
|------|---------------|-----------------|
| `src/index.ts` | ADD imports + calls | Import `setupCrawlJobs`, `setupCleanupJob`, `createWorker`; call after server.listen |
| `src/crawlers/ticketmaster.ts` | SWAP import + call site | `upsertEvent` → `deduplicateAndSave` at line 17 + line 110 |
| `src/crawlers/axs.ts` | SWAP import + call site | `upsertEvent` → `deduplicateAndSave` at line 23 + save call |
| `src/crawlers/dice.ts` | SWAP import + call site | `upsertEvent` → `deduplicateAndSave` at line 3 + save call |
| `src/crawlers/venues/base-venue-crawler.ts` | SWAP import + call site | `upsertEvent` → `deduplicateAndSave` at line 29 + line 186 |

**Files that must NOT be modified:**
- `src/repositories/event-repository.ts` — `upsertEvent` is still used internally by `deduplicator.ts`
- `src/scheduling/jobs.ts` — already correct, no changes needed
- `src/scheduling/processors.ts` — already correct, no changes needed
- `src/deduplication/deduplicator.ts` — already correct, no changes needed
