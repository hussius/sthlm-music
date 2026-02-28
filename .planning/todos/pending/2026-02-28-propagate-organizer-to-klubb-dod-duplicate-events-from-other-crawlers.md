---
created: 2026-02-28T15:50:12.911Z
title: Propagate organizer to Klubb Död duplicate events from other crawlers
area: api
files:
  - src/services/deduplicator.ts
  - src/crawlers/venues/klubbdod.ts
  - src/repositories/events.repository.ts
---

## Problem

Klubb Död hosts events at rotating venues (Slaktkyrkan, Debaser, etc.). These venues have their own crawlers that scrape the same events without knowing they belong to Klubb Död. The deduplication engine merges duplicate events but does not propagate the `organizer` field — so if a Klubb Död event is first seen via e.g. the Slaktkyrkan crawler (organizer: null) and later deduplicated against the Klubb Död crawler result (organizer: 'Klubb Död'), the merged event may end up with organizer: null.

This means the organizer filter won't surface events unless the Klubb Död crawler ran first and "won" the merge.

## Solution

In the deduplication merge logic (`deduplicator.ts`), when merging two events:
- If one has `organizer` set and the other is null, prefer the non-null value.
- If both have different organizers set, keep the existing one (first-write wins) or pick the more specific one.

Also check `events.repository.ts` upsert logic — the `onConflictDoUpdate` may be overwriting `organizer` with null from the second crawler's payload. Fix: only update `organizer` if the incoming value is non-null.
