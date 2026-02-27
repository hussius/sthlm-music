---
created: 2026-02-22T13:12:06.251Z
title: Investigate and add 5 more venue crawlers while waiting for Tickster
area: crawlers
files:
  - crawl-all.js
  - client/src/components/FilterBar.tsx
---

## Problem

Phase 4 plan 02 (Tickster API) is blocked waiting for an API key. There are several Stockholm
venues worth investigating as plain fetch() + Cheerio crawlers in the meantime.

Previously checked venues like Rosettas and Geronimos were found to be JS-rendered (MEC AJAX),
but may be worth re-checking or approaching differently. New venues like Slakthuset (the club,
not Hus 7) and Gröna Lund haven't been investigated yet.

## Solution

Investigate each venue's HTML structure with WebFetch before committing to a crawler.
Use the existing crawl-*.js pattern (fetch + cheerio + drizzle upsert).

**Venues to investigate:**

1. **Rosettas** — https://rosettas.se/program/
   - Previously found to be MEC AJAX (JS-rendered). Re-check if static HTML is usable.

2. **Slakthusetclub** — https://slakthusetclub.se/events/
   - Different from Slakthusen (Hus 7). A club venue, separate crawler needed.

3. **Göta Lejon** — https://www.gotalejon.se/kalendarium?Genres=rock%2Cpop%2Cother%2Cjazz-and-blues%2Ccountry%2Calternative-and-indie
   - Pre-filtered URL for music genres. Check if SPA or static.

4. **Gröna Lund** — https://www.gronalund.com/konserter#filter=Stora Scen,Lilla Scen
   - Concert listing with stage filter. Check if Gatsby/JS or has static fallback.

5. **Geronimos FGT** — https://www.geronimosfgt.se/shows-events-live-music/
   - Previously found to be MEC AJAX. Re-check.

**Approach:**
1. WebFetch each URL to check static HTML structure
2. If static → write crawl-*.js, add to crawl-all.js and FilterBar
3. If JS-rendered → note in this todo, skip for now (would need Playwright)
4. Commit working crawlers once confirmed
