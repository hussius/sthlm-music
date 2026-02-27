---
created: 2026-02-25T21:09:37.306Z
title: Filter out non-concert entries from event data
area: api
files:
  - src/normalization/schemas.ts
  - src/repositories/event-repository.ts
  - src/crawlers/
---

## Problem

Crawlers (particularly venue sites and possibly Ticketmaster/AXS) ingest non-concert entries that pollute the calendar. Examples mentioned: "presentkort" (Swedish for "gift card"), "quiz", and similar non-music events.

Users browsing the calendar see irrelevant listings mixed in with actual concerts/gigs, reducing trust and usability. The calendar should only show music events.

## Solution

Two-layer approach:

1. **Blocklist at normalization layer** (`src/normalization/schemas.ts` or a new `src/normalization/event-filters.ts`):
   - Define a blocklist of Swedish/English terms that indicate non-concert entries
   - Examples: `presentkort`, `quiz`, `quiz night`, `gift card`, `gift voucher`, `trivia`, `bingo`, `standup`
   - Apply during `EventSchema` validation — reject events whose name matches blocklist terms
   - Consider case-insensitive, whole-word matching to avoid false positives (e.g. "Prestige" should not match "prest")

2. **API-level genre/category filter** (longer term):
   - If ticket platforms return a category/type field, filter to music-only categories at crawl time
   - Ticketmaster has `classificationName: "Music"` — enforce this in `src/crawlers/ticketmaster.ts`

Start with blocklist approach as it's quickest to implement and covers venue site crawlers.
