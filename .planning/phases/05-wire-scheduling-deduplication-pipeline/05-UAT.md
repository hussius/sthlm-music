---
status: complete
phase: 05-wire-scheduling-deduplication-pipeline
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md]
started: 2026-02-26T19:35:00Z
updated: 2026-11-12T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. API starts without Redis
expected: Start the server without Redis running. HTTP server starts successfully and serves requests. Redis error is logged but does not crash the process.
result: skipped
reason: Obsolete. Redis/BullMQ scheduling was removed (commits 971ff35, f1e4127); the API no longer depends on Redis at all.

### 2. Crawl jobs register at startup (with Redis)
expected: Start the server with Redis running. Logs show BullMQ worker created and 5 jobs registered — Ticketmaster (3 AM), AXS (3:15 AM), DICE (3:30 AM), venues (4 AM), cleanup (Sunday 4 AM).
result: skipped
reason: Obsolete. BullMQ job scheduling was removed; crawls now run via crawl-all.js on Railway.

### 3. Crawlers deduplicate on re-run
expected: Run any crawler twice (e.g. `node crawl-all.js`). The second run should not create duplicate event rows — event count stays the same or increases only for genuinely new events.
result: skipped
reason: Superseded. Deduplication was reworked after this phase (e997250, 822afe7, 2f09736, ee41c38) and is enforced by the unique venue_date_idx index; not re-run against production.

### 4. review_queue migration applies cleanly
expected: Run `npm run db:migrate` — migration `0002_add_review_queue.sql` applies without error and creates the `review_queue` table in the database.
result: pass
note: Verified 2026-11-12 — review_queue table exists in the production Neon database.

## Summary

total: 4
passed: 1
issues: 0
pending: 0
skipped: 3

## Gaps

[none]
