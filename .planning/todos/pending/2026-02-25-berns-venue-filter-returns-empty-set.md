---
created: 2026-02-25T21:49:37.497Z
title: Berns venue filter returns empty set
area: crawlers
files:
  - src/crawlers/venues/berns.ts
  - client/src/components/FilterBar.tsx
---

## Problem

Selecting "Berns" in the venue dropdown returns an empty result set. Unclear whether:
1. The Berns crawler failed to scrape any events (JS-rendered site — known limitation noted in Phase 4 success criteria: "Berns crawler exists (JS-rendered site, 0 events acceptable as known limitation)")
2. The FilterBar venue option value "Berns" doesn't match the canonical name stored in DB
3. The crawler ran but events were filtered out or errored during ingest

## Solution

1. **Check crawler output first:** Run `node src/crawlers/venues/berns.ts` (or equivalent) manually and inspect output. If 0 events, this is the known JS-rendering limitation — may need Playwright/headless browser approach.

2. **Check canonical name:** Query DB for any Berns events: `SELECT DISTINCT venue FROM events WHERE venue ILIKE '%berns%';` — verify the canonical name matches the FilterBar option value exactly.

3. **If crawler works but filter fails:** Fix FilterBar option value to match canonical name (same fix pattern as "Pet Sounds" / "Pet Sounds Bar" mismatch from Phase 6).

4. **If crawler genuinely can't scrape Berns:** Consider whether to keep the dead dropdown option or remove it and add a note in the UI.

Note: Phase 4 plan 04-01 documented Berns as a "JS-rendered site, 0 events acceptable as known limitation" — this may simply be working as designed.
