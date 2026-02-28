---
created: 2026-02-25T21:09:37.306Z
title: Tag events with organizer for organizer filtering
area: api
files:
  - src/db/schema.ts
  - src/normalization/schemas.ts
  - src/normalization/transformers.ts
  - client/src/components/FilterBar.tsx
---

## Problem

Some Stockholm music organizers host events at rotating or multiple venues, so venue filtering doesn't help fans follow them. Examples:

- **Klubb Död** (https://klubbdod.se) — metal/punk club night that moves between venues
- **Jazz är Farligt** — jazz event series hosted at different locations

Users who follow a specific organizer/promoter have no way to filter for their events — they'd need to search by artist name or know every venue the organizer uses.

## Solution

Add an `organizer` field to the event schema and populate it where the data source provides it:

1. **Schema** (`src/db/schema.ts`): Add `organizer: text('organizer')` column (nullable)

2. **Normalization** (`src/normalization/schemas.ts`): Add optional `organizer` field to `EventSchema`

3. **Crawlers**:
   - Where organizer is explicitly listed on the event page (e.g. venue sites that host third-party club nights), extract it
   - For dedicated organizer websites (e.g. klubbdod.se), the organizer IS the site — hardcode as part of the crawler config
   - Consider adding a dedicated crawler for Klubb Död and Jazz är Farligt if they list their own calendars

4. **API** (`src/api/validators/events.schema.ts`): Add `organizer` filter param to `EventFiltersSchema`

5. **Repository** (`src/repositories/events.repository.ts`): Add `eq(events.organizer, filters.organizer)` filter condition

6. **UI** (`client/src/components/FilterBar.tsx`): Add organizer dropdown or search input

**Note:** Data availability is the main challenge — most venue sites won't expose the organizer. This feature is most useful for organizers with their own websites that can be crawled directly.
