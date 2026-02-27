---
created: 2026-02-21T21:27:21.581Z
title: Expand crawler coverage with new APIs and venues
area: crawlers
files:
  - CRAWLERS.md
  - src/crawlers/
---

## Problem

Current crawler coverage is incomplete:

1. **Missing APIs:**
   - Tickster API integration (API key request pending)
   - Eventbrite API (needs evaluation for Stockholm events)

2. **Broken/Incomplete scrapers:**
   - Nalen scraper returns no hits (selectors likely broken)
   - Kollektivet Livet scraper seems to capture too few events (needs verification)

3. **Missing venue scrapers (20+ venues):**
   Gamla Enskede Bryggeri, Gröna Lund, Cirkus, Kraken, Göta Lejon, Rosettas, Slakthuset, Yttons, Alcazar, Tre Backar, Tranan, Konserthuset, Snövit, Cafe 44, Kolingsborg, Fryshuset, Klubben, Studion, Sofia Common, Fredagsmangel

This limits the comprehensiveness of event coverage, which is the core value proposition of the app.

## Solution

**Phase 1: Fix existing issues**
1. Debug Nalen scraper - inspect page structure, update selectors
2. Verify Kollektivet Livet coverage - check if we're missing pagination or event types

**Phase 2: New APIs**
1. Integrate Tickster API when key becomes available
2. Research Eventbrite API - check if it covers Stockholm music events adequately

**Phase 3: New venue scrapers**
1. Prioritize venues by expected event volume (Gröna Lund, Konserthuset likely highest)
2. Use existing venue crawler pattern from Phase 1 (VenueConfig structure)
3. Add scrapers incrementally, test deduplication as we go

**Files to create/modify:**
- `src/crawlers/tickster.ts` (new)
- `src/crawlers/eventbrite.ts` (new, if evaluation is positive)
- `src/crawlers/venues/nalen.ts` (fix)
- `src/crawlers/venues/kollektivet-livet.ts` (investigate)
- `src/crawlers/venues/[20+ new venues].ts` (new)
- `CRAWLERS.md` (document new sources)
