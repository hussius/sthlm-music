# 04-01 Summary: New Venue Crawlers

**Completed:** 2026-02-22
**Status:** ✅ Done

## One-liner
Added 4 working venue crawlers (Stampen, GEB, Reimersholme, Cirkus) and a stubbed Berns crawler; all wired into crawl-all.js and FilterBar.

## What Was Built

| Crawler | File | Status | Notes |
|---|---|---|---|
| Stampen | crawl-stampen.js | ✅ Working | WordPress MEC plugin, article+h3 structure |
| Gamla Enskede Bryggeri | crawl-gamla-enskede-bryggeri.js | ✅ Working | Inline text parsing, br→newline strategy |
| Reimersholme Hotel | crawl-reimersholme.js | ✅ Working | h3>a title, sibling p date, Swedish months |
| Cirkus | crawl-cirkus.js | ✅ Working | Paginated, Swedish abbreviated dates |
| Berns | crawl-berns.js | ⚠️ Stubbed | 0 events — JS-rendered content not in static HTML |

## Key Technical Decisions

- **Plain fetch() + Cheerio**: All crawlers use static HTML parsing. No Playwright needed for these venues.
- **Cheerio gotcha**: `$el.find('> child')` doesn't work — use `$el.children('tag')` for direct children.
- **GEB approach**: Events are inline text (not `<li>`), so replaced `<br>` and `</p>` with newlines and parsed line-by-line.
- **Reimersholme**: `<h3>` wraps `<a>` (not the other way around) — used `$a.parent('h3')` to navigate correctly.
- **Cirkus dates**: `<strong>` tags collapse whitespace so "sön 22 feb" renders as "sön22feb" in `.text()` — regex uses `\s*`.
- **Berns**: Static HTML has 9 `/calendar/` links but event titles are in a sibling `<div>` and appear to require JS to render. Left as stub.

## Files Modified

- `crawl-stampen.js` — new
- `crawl-gamla-enskede-bryggeri.js` — new
- `crawl-reimersholme.js` — new
- `crawl-cirkus.js` — new
- `crawl-berns.js` — new (stub)
- `crawl-all.js` — added 5 new crawlers
- `client/src/components/FilterBar.tsx` — added 5 new venue options

## What Was Skipped / Deferred

- **Berns**: JS-rendered. Would need Playwright. Left as stub with 0 events.
- **Under Bron**: Known broken, not attempted.
- **Rosettas, Geronimo's**: JS-rendered MEC AJAX — not feasible with static fetch.
- **Spice99**: No website, Instagram/RA only.
- **RA (ra.co)**: 403 blocked, no public API.
- **Rival, Göta Lejon, Konserthuset, Gröna Lund**: All JS-rendered SPAs.
- **Hus 7**: Already covered by Slakthusen crawler.
- **Debaser**: Already covered (Nova & Strand crawlers).
