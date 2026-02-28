---
created: 2026-02-28T15:50:12.911Z
title: Add Jazz är farligt as organizer crawler
area: api
files:
  - src/crawlers/venues/klubbdod.ts
  - client/src/components/FilterBar.tsx
---

## Problem

Jazz är farligt is a Stockholm club/organizer run by Elena Wolay that hosts events at rotating venues (primarily Slaktkyrkan and Hus 7). Like Klubb Död, these events get scraped by venue-specific crawlers but without an organizer tag — so users can't filter by organizer to find all Jazz är farligt events.

## Solution

1. **Find event source**: No dedicated website found. Known sources:
   - Facebook: https://www.facebook.com/JazzArFarligt/
   - Slaktkyrkan event listings: https://slakthusen.se (events tagged "Jazz är farligt")
   - RA.co: check https://ra.co/promoters/jazz-ar-farligt (may exist)
   - The organizer name appears consistently as "Jazz är farligt" or "Jazz Är Farligt" in venue listings

2. **Crawl approach options** (in preference order):
   - Facebook Events page (scraping FB is fragile/against ToS — use only if no alternative)
   - Slaktkyrkan/Hus 7 crawler: filter events where title or description contains "Jazz är farligt" and tag organizer
   - Manual/regex match in normalization layer: if event title matches known Jazz är farligt patterns, set organizer

3. **Deduplication**: Once organizer is set, ensure the upsert logic preserves organizer on conflict (see related todo: propagate-organizer-to-klubb-dod)

4. **UI**: Add "Jazz är farligt" to the organizer dropdown in FilterBar.tsx alongside "Klubb Död"
