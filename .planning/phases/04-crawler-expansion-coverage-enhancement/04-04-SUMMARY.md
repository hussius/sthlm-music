---
phase: 04-crawler-expansion-coverage-enhancement
plan: "04"
subsystem: crawlers
tags: [crawlers, rival, under-bron, cheerio, venue-direct]
dependency_graph:
  requires: []
  provides: [crawl-rival.js, crawl-underbron-fixed.js]
  affects: [crawl-all.js, client/src/components/FilterBar.tsx]
tech_stack:
  added: []
  patterns: [cheerio-fetch-pattern, dd/m-date-parsing, bootstrap-carousel-parsing]
key_files:
  created:
    - crawl-rival.js
    - crawl-underbron-fixed.js
  modified:
    - crawl-all.js
    - client/src/components/FilterBar.tsx
decisions:
  - Rival date is embedded in h3 title (e.g. "Pepperland – Play The Beatles 28/2") — parse DD/M from end of title and strip it to get clean name
  - Under Bron uses .programpost containers with .datumdatum — better than $('*').filter() approach in original broken crawler
  - Under Bron event names derived from image filenames (cleaned), falling back to "Under Bron Club Night" — club site has no textual artist names
  - 0 events from Under Bron is non-fatal — club listing may not always be populated far in advance
metrics:
  duration: 4 minutes
  completed: "2026-02-26"
  tasks: 3
  files: 4
---

# Phase 4 Plan 04: Rival and Under Bron Crawlers Summary

**One-liner:** Rival Bootstrap carousel crawler with embedded-date h3 parsing, plus fixed Under Bron club crawler using .programpost selectors and image filename name extraction.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create Rival venue crawler | 7af0096 | crawl-rival.js |
| 2 | Fix and replace Under Bron crawler | 3c98d6d | crawl-underbron-fixed.js |
| 3 | Wire both crawlers into crawl-all.js and FilterBar | f04d7f3 | crawl-all.js, FilterBar.tsx |

## What Was Built

### crawl-rival.js
Crawler for Hotel Rival (www.rival.se) — 735-seat salon on Södermalm hosting concerts and comedy.

- Fetches the homepage which contains a Bootstrap carousel (`#upcoming .carousel-item`)
- Each carousel item has an `h3` with the event title and date embedded at the end (e.g. "Pepperland – Play The Beatles 28/2" or "Magnus Betnér 5-7/3")
- Parses the date using regex matching `DD/M` or `DD-DD/M` (range — uses first date)
- Strips the date portion to produce a clean event name
- Falls back to Swedish month name format ("12 mars") if no slash-date found
- Extracts the event URL from the "Mer Info" link within the carousel item
- Defaults to 19:00 show time, skips past events
- Upserts with `onConflictDoUpdate` on (venue, date)

### crawl-underbron-fixed.js
Fixed replacement for the broken crawl-underbron.js crawler for Under Bron club venue.

**What was wrong with the original:** The original used `$('*').filter()` — a generic traversal that matches every DOM element, producing massive false-positive matches. The date regex `/\d{1,2}[\/\s](\d{1,2}|\w{3})/` was too broad, matching things like "22-23" (pricing).

**Improved approach:**
- Directly selects `.programpost` containers (the actual event divs)
- Extracts dates from `.datumdatum` elements (clean "27/2" format)
- Derives event names from image filenames (strip timestamp prefix, clean up hyphens, title-case)
- Generic day-of-week-only filenames (sat-7.jpg, fri-13.jpg) return null → falls back to "Under Bron Club Night"
- Named event filenames (s-club-stockholm-final.jpg → "S Club Stockholm") are extracted

### crawl-all.js
- Replaced the commented-out `// Under Bron disabled - parsing is broken` block with active `{ name: 'Under Bron', file: './crawl-underbron-fixed.js' }`
- Added `{ name: 'Rival', file: './crawl-rival.js' }` after B-K

### FilterBar.tsx
- Added `<option value="Rival">Rival</option>`
- Added `<option value="Under Bron">Under Bron</option>`

## Decisions Made

1. **Rival date embedded in h3 title** — rival.se includes the date directly in the event title text (e.g. "28/2" or "5-7/3"). Rather than looking for a separate date element, parse the date from the h3 and strip it to produce the clean name.

2. **Under Bron .programpost selector** — The structured `.programpost` approach is far more reliable than the original `$('*').filter()` scan, which matched every element in the DOM and produced false positives.

3. **Under Bron name from image filename** — The venue site has no textual artist names for most events. Image filenames sometimes encode the event name (e.g. `s-club-stockholm-final.jpg`). Generic day-of-week filenames (sat-7.jpg) are filtered out.

4. **0 events non-fatal for Under Bron** — A club venue may have no upcoming events listed yet. The crawler exits 0 gracefully.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Notes on Verification

The plan's `<verify>` step (`node crawl-rival.js 2>&1 | tail -5`) cannot be fully verified in the sandbox environment because the sandbox's Node.js process cannot resolve DNS (network sandbox restriction). However:
- `curl` successfully reaches both `www.rival.se` and `www.underbron.com` confirming the sites are accessible
- The HTML structure was inspected via curl and confirmed to match the expected selectors
- Both crawlers pass `node --check` syntax validation
- The parsing logic was verified by inspection against the real HTML content
- All other project crawlers (nalen.js, etc.) also fail DNS in the sandbox — this is a known environment constraint, not a code bug

## Self-Check

### Files Created
- crawl-rival.js: FOUND
- crawl-underbron-fixed.js: FOUND

### Commits Verified
- 7af0096: feat(04-04): add Rival venue crawler — FOUND
- 3c98d6d: feat(04-04): add fixed Under Bron crawler — FOUND
- f04d7f3: feat(04-04): wire Rival and Under Bron into crawl-all and FilterBar — FOUND

## Self-Check: PASSED
