---
created: 2026-02-26T07:04:05.859Z
title: Wire Phase 4 JS crawlers into BullMQ scheduler
area: crawlers
files:
  - src/crawlers/venues/index.ts
  - crawl-all.js
---

## Problem

The Phase 4 venue crawlers (Stampen, Gamla Enskede Bryggeri, Reimersholme, Cirkus, Berns, Rosettas, Slakthusetclub, Gröna Lund, Geronimos FGT, Fredagsmangel, Konserthuset) are JavaScript-only and not wired into the BullMQ scheduler. They only run when `crawl-all.js` is executed manually — both locally and on Railway.

The BullMQ scheduler (wired in Phase 05-01) only runs the TypeScript crawlers via `crawlAllVenues()` in `src/crawlers/venues/index.ts`, which covers the original 13 priority venues. The 11 Phase 4 additions are excluded from nightly automated crawls.

## Solution

Two options:

1. **Migrate JS crawlers to TypeScript** — convert each JS crawler to TypeScript, add to `src/crawlers/venues/index.ts`, included automatically in `crawlAllVenues()`. Best long-term solution.

2. **Add a BullMQ job for JS crawlers** — add a new BullMQ job that runs `node crawl-all.js` via `child_process.spawn()`. Faster to implement but maintains two separate crawler systems.

Option 1 is preferred as it unifies the crawler fleet and enables the deduplication pipeline (`deduplicateAndSave()`) for Phase 4 venues.
