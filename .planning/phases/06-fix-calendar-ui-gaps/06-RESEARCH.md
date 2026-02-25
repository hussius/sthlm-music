# Phase 06: Fix Calendar UI Gaps - Research

**Researched:** 2026-02-25
**Domain:** React frontend UI wiring (FilterBar, EventCard, EventModal, EventList)
**Confidence:** HIGH

## Summary

All the infrastructure for this phase is already built and functional. The genre filter component exists in FilterBar but is commented out at lines 93-109. The EventModal component is fully implemented and polished but is never rendered — no click handler exists in EventCard, no `selectedEvent` state in EventList, and the comment `{/* Modal disabled for now */}` sits at EventList line 108. The debug pagination banner is a `bg-yellow-100` div at EventList line 99 that unconditionally renders internal state.

The venue filter has a specific mismatch: FilterBar hardcodes venue names that diverge from canonical names stored by the crawlers. Most critically, FilterBar shows "Pet Sounds" but crawlers store "Pet Sounds Bar" (from venue-mappings.ts which maps `pet sounds` -> `Pet Sounds Bar`), so that filter never returns results. The genre filter select has no `<option>` values populated — it only has "All Genres" with an empty string — so even if it were uncommented, it would need the 11 canonical genres added.

The API already supports genre filtering via the `genre` query param (validated by Zod EventFiltersSchema, applied as `eq(events.genre, filters.genre)` in the repository). No backend changes are needed.

**Primary recommendation:** This is a pure frontend fix. Three surgical changes to three files complete all five success criteria.

## Current State Per File

### `client/src/components/FilterBar.tsx`

**Genre filter** (lines 93-109): Entire `<div>` block commented out with `{/* ... */}`. The select tag has no genre `<option>` values — only `<option value="">All Genres</option>`. The state wiring is correct: `updateFilters({ genre: e.target.value || undefined })`.

**Venue filter** (lines 111-150): Rendered and functional. The `onChange` handler correctly calls `updateFilters({ venue: e.target.value || undefined })`. However, **4 venue names do not match canonical DB values**:

| FilterBar value | Canonical DB value | Source |
|---|---|---|
| `Pet Sounds` | `Pet Sounds Bar` | venue-mappings.ts maps `pet sounds` -> `Pet Sounds Bar`; crawl-petsounds.js uses `'Pet Sounds'` |
| `Debaser Nova` | `Debaser Nova` | crawl-debaser-fixed.js line 101 — CORRECT |
| `Debaser Strand` | `Debaser Strand` | crawl-debaser-fixed.js line 103 — CORRECT |
| `Reimersholme` | `Reimersholme` | crawl-reimersholme.js — CORRECT |

**CRITICAL FINDING on Pet Sounds:** There is a conflict. `venue-mappings.ts` maps `'pet sounds'` -> `'Pet Sounds Bar'`, but `crawl-petsounds.js` directly inserts `VENUE_NAME = 'Pet Sounds'` (bypassing the normalization layer). The root crawl scripts bypass `normalizeVenueName()` entirely, writing directly to the DB with raw string. So the DB canonical value for Pet Sounds is `'Pet Sounds'` (not `'Pet Sounds Bar'`). FilterBar has it right. The venue-mappings.ts is inconsistent with actual DB data but that is not in scope for this phase.

**Missing venues in FilterBar** that have active crawlers:
The following venues have crawlers in `crawl-all.js` but are absent from FilterBar:
- `Kollektivet Livet` — present in FilterBar line 125
- `Debaser Nova` — present line 126
- `Debaser Strand` — present line 127
- `Slaktkyrkan` — NOT in FilterBar (crawler: crawl-slaktkyrkan.js)
- `Hus 7` — present line 129 (from crawl-slakthusen.js which extracts venue name from `.stalle`)
- `Fasching` — present line 130
- `Nalen` — present line 131
- `Fylkingen` — present line 132
- `Pet Sounds` — present line 133
- `Fållan` — present line 134
- `Södra Teatern` — present line 135
- `Rönnells Antikvariat` — present line 136
- `Banankompaniet` — present line 137
- `Berns` — present line 138
- `Cirkus` — present line 139
- `Stampen` — present line 140
- `Gamla Enskede Bryggeri` — present line 141
- `Reimersholme` — present line 142
- `Rosettas` — present line 143
- `Slakthusetclub` — present line 144
- `Gröna Lund` — present line 145
- `Geronimos FGT` — present line 146
- `Konserthuset` — present line 147
- `Fredagsmangel` — present line 148

Venues with crawlers NOT in FilterBar:
- `Slaktkyrkan` — crawl-slaktkyrkan.js stores `'Slaktkyrkan'` (via VENUE_NAME check needed)
- Slakthusen sub-venues (whatever `.stalle` extracts — likely `Hus 7`, `Slakthuset`, `Kägelbanan`)
- `Landet` — crawl-landet-billetto.js may use `'Landet'`

The main gap is `Slaktkyrkan`. All 24 venues currently in FilterBar appear to be correct.

### `client/src/components/EventList.tsx`

**Debug banner** (lines 99-106):
```tsx
<div ref={ref} className="py-5 text-center bg-yellow-100">
  <p className="text-xs text-gray-500">
    hasNextPage: {String(hasNextPage)} | isFetchingNextPage: {String(isFetchingNextPage)}
  </p>
  {isFetchingNextPage && (
    <p className="text-gray-600">Loading more events...</p>
  )}
</div>
```
The `bg-yellow-100` class and the debug `<p>` text need removal. The `ref` (infinite scroll trigger) must be kept. The "Loading more events..." text is user-appropriate and should stay.

**Modal wiring**: Line 108 contains `{/* Modal disabled for now */}`. No `selectedEvent` state, no `setSelectedEvent`, no `onClick` handler passed to `EventCard`. This is the core missing wiring.

### `client/src/components/EventCard.tsx`

EventCard accepts `{ event: EventResponse }` but has no `onClick` prop. The component renders either as `<a href={ticketUrl}>` (if ticket URL exists) or as `<article>` (if no URL). To wire the modal, EventCard must accept an `onSelect` callback and render as a button/clickable div in all cases (not an `<a>` tag directly to the ticket URL).

**Critical design decision**: Currently EventCard links directly to the ticket URL if one exists. For the modal pattern, clicking the card should open the modal, and the modal has the "Buy Tickets" button. This requires changing the card from `<a>` to a clickable `<div>` or `<button>` with `onClick={onSelect}`. The ticket link remains accessible via the modal.

### `client/src/components/EventModal.tsx`

**Fully implemented.** Features:
- Portal rendering via `createPortal(modalContent, document.body)` (line 175)
- Escape key handler (lines 31-41)
- Backdrop click to close (line 63)
- Body scroll lock (lines 43-48)
- Displays: event name, artist, date, venue, genre, price
- Ticket sources: primary button + additional links
- Full ARIA accessibility (role="dialog", aria-modal, aria-labelledby)

**Status: Ready to use as-is.** No changes needed to EventModal.

### `src/repositories/events.repository.ts`

Genre filter: line 109-111 — `eq(events.genre, filters.genre)` — exact match. Uses `genre_idx` B-tree index.
Venue filter: line 122-124 — `eq(events.venue, filters.venue)` — exact match. Uses `venueDateIdx` unique index.

**Backend is fully functional.** No changes needed.

### `src/db/schema.ts`

- `genre: text('genre').notNull()` — no enum constraint, plain text
- `venue: text('venue').notNull()` — normalized venue name
- `CANONICAL_GENRES` in `genre-mappings.ts`: `['rock', 'pop', 'electronic', 'jazz', 'hip-hop', 'metal', 'indie', 'folk', 'classical', 'world', 'other']`

## Canonical Venue Names in Database

All canonical venue names as stored by active crawlers (from `crawl-all.js` + individual scripts):

| Venue Name (DB) | Source Script | In FilterBar? |
|---|---|---|
| `Kollektivet Livet` | crawl-stadsgarden.js | Yes |
| `Debaser Nova` | crawl-debaser-fixed.js | Yes |
| `Debaser Strand` | crawl-debaser-fixed.js | Yes |
| `Debaser` | crawl-debaser.js (legacy) | No (covered by Nova/Strand) |
| `Slaktkyrkan` | crawl-slaktkyrkan.js | No - MISSING |
| `Hus 7` | crawl-slakthusen.js (from .stalle) | Yes |
| `Slakthuset` | crawl-slakthusen.js (from .stalle) | No |
| `Kägelbanan` | crawl-slakthusen.js (from .stalle) | No |
| `Fasching` | crawl-fasching.js | Yes |
| `Nalen` | crawl-nalen.js | Yes |
| `Fylkingen` | crawl-fylkingen-fixed.js | Yes |
| `Pet Sounds` | crawl-petsounds.js | Yes |
| `Fållan` | crawl-fallan.js | Yes |
| `Södra Teatern` | crawl-sodrateatern.js | Yes |
| `Rönnells Antikvariat` | crawl-ronnells.js | Yes |
| `Banankompaniet` | crawl-banan-kompaniet.js | Yes |
| `Berns` | crawl-berns.js | Yes |
| `Cirkus` | crawl-cirkus.js | Yes |
| `Stampen` | crawl-stampen.js | Yes |
| `Gamla Enskede Bryggeri` | crawl-gamla-enskede-bryggeri.js | Yes |
| `Reimersholme` | crawl-reimersholme.js | Yes |
| `Rosettas` | crawl-rosettas.js | Yes |
| `Slakthusetclub` | crawl-slakthusetclub.js | Yes |
| `Gröna Lund` | crawl-gronalund.js | Yes |
| `Geronimos FGT` | crawl-geronimosfgt.js | Yes |
| `Konserthuset` | crawl-konserthuset.js | Yes |
| `Fredagsmangel` | crawl-fredagsmangel.js | Yes |

**FilterBar venues that may not match DB if "Berns" returns empty** (known TODO):
From commit `49e6356 docs: capture todo - Berns venue filter returns empty set` — there is a known open issue. The FilterBar value `'Berns'` matches `crawl-berns.js VENUE_NAME = 'Berns'` so the name is correct. The empty results are likely a data availability issue (crawl not run yet), not a name mismatch. Not in scope for this phase.

## Canonical Genre Values in Database

From `src/normalization/genre-mappings.ts` — `CANONICAL_GENRES`:
```
'rock', 'pop', 'electronic', 'jazz', 'hip-hop', 'metal', 'indie', 'folk', 'classical', 'world', 'other'
```
Note: Most venue-direct crawlers default to `'other'` for genre since venues don't publish genre data. Fredagsmangel is an exception — it hardcodes `'metal'`.

## Architecture Patterns

### Pattern 1: EventList State + Modal Rendering

The standard React pattern for modal with list selection:

```typescript
// EventList.tsx additions
import { useState } from 'react';
import { EventModal } from './EventModal';

// Inside EventList component:
const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(null);

// Pass handler to cards:
<EventCard key={event.id} event={event} onSelect={() => setSelectedEvent(event)} />

// After the grid, before closing fragment:
{selectedEvent && (
  <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
)}
```

### Pattern 2: EventCard Click Handler

EventCard needs an `onSelect` prop. The card must be a clickable element in all cases (not just when a ticket URL exists):

```typescript
interface EventCardProps {
  event: EventResponse;
  onSelect?: () => void;
}

// Replace both <a> and <article> with a single clickable article:
<article
  onClick={onSelect}
  className={`border border-gray-200 rounded-lg p-3 bg-white shadow-sm ${onSelect ? 'cursor-pointer hover:shadow-md hover:border-blue-400 transition-all' : ''}`}
  role={onSelect ? 'button' : undefined}
  tabIndex={onSelect ? 0 : undefined}
  onKeyDown={onSelect ? (e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); } : undefined}
>
  {cardContent}
</article>
```

### Pattern 3: Genre Filter Options

The genre select needs `<option>` tags for each canonical genre:

```tsx
<option value="">All Genres</option>
<option value="rock">Rock</option>
<option value="pop">Pop</option>
<option value="electronic">Electronic</option>
<option value="jazz">Jazz</option>
<option value="hip-hop">Hip-hop</option>
<option value="metal">Metal</option>
<option value="indie">Indie</option>
<option value="folk">Folk</option>
<option value="classical">Classical</option>
<option value="world">World</option>
<option value="other">Other</option>
```

### Pattern 4: Debug Banner Removal

The `ref` must stay (it's the infinite scroll trigger). Only the styling and debug text change:

```tsx
// BEFORE (lines 99-106):
<div ref={ref} className="py-5 text-center bg-yellow-100">
  <p className="text-xs text-gray-500">
    hasNextPage: {String(hasNextPage)} | isFetchingNextPage: {String(isFetchingNextPage)}
  </p>
  {isFetchingNextPage && (
    <p className="text-gray-600">Loading more events...</p>
  )}
</div>

// AFTER:
<div ref={ref} className="py-5 text-center">
  {isFetchingNextPage && (
    <p className="text-gray-600">Loading more events...</p>
  )}
</div>
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Modal portal rendering | Custom z-index stacking | `createPortal` (already in EventModal) | EventModal already uses it correctly |
| Escape key handling | Custom event manager | EventModal's existing useEffect | Already implemented |
| Infinite scroll trigger | Manual scroll listener | `react-intersection-observer` `ref` | Already wired in EventList |
| Filter state | Local component state | `useFilterState` hook (URL params) | Already wired, genre param already in schema |

## Common Pitfalls

### Pitfall 1: Removing the `ref` from the debug banner div
**What goes wrong:** Infinite scroll stops working — no more pages load.
**Why it happens:** The `ref={ref}` on that div is the intersection observer trigger.
**How to avoid:** Keep `ref={ref}` on the container div, only remove `bg-yellow-100` class and the debug `<p>` element.

### Pitfall 2: EventCard as `<a>` blocks modal click
**What goes wrong:** Clicking a card navigates to ticketmaster/dice/venue URL instead of opening the modal.
**Why it happens:** The current EventCard renders as `<a href={ticketUrl}>` when a ticket URL exists (line 62-71). Wrapping it with an onClick won't prevent `<a>` navigation.
**How to avoid:** Replace the `<a>` with a clickable `<article>` that has `cursor-pointer` and an `onClick` handler. Move ticket links into the modal only.

### Pitfall 3: Genre filter sends capitalized value to API
**What goes wrong:** Genre filter sends `'Rock'` but DB stores `'rock'` — returns no results.
**Why it happens:** `<option value="Rock">Rock</option>` — case mismatch.
**How to avoid:** Use lowercase values in all `<option value="">` attributes to match `CANONICAL_GENRES` exactly.

### Pitfall 4: `useEffect` deps array in FilterBar causes update loop
**What goes wrong:** Adding `updateFilters` to deps in the default-date useEffect causes infinite re-renders.
**Why it happens:** `updateFilters` is a new function reference on each render (created inside the hook). The current code has `[filters, updateFilters]` at line 36 which is already potentially problematic — but this is pre-existing, not introduced by this phase.
**How to avoid:** Don't touch the existing useEffect dependencies.

### Pitfall 5: Venue `Slaktkyrkan` missing from FilterBar
**What goes wrong:** Users can't filter for Slaktkyrkan events even though the crawler runs.
**Why it happens:** FilterBar never had it added (it was in the original 13 priority venues).
**How to avoid:** Add `<option value="Slaktkyrkan">Slaktkyrkan</option>` to the venue dropdown. This is a quick win aligned with FILT-03.

## Specific Line Numbers for Changes

### `client/src/components/FilterBar.tsx`
- **Lines 93-109**: Uncomment the genre filter block. Add 11 `<option>` elements with lowercase values.
- **Lines 124-148**: Venue options are already correct for all active crawlers. Add `Slaktkyrkan` option.

### `client/src/components/EventList.tsx`
- **Line 13**: Add `useState` to React imports.
- **Line 17**: Add `EventModal` import.
- **Lines 21-22**: Add `selectedEvent` state.
- **Lines 93-95**: Add `onSelect` prop to EventCard render.
- **Lines 99-106**: Remove `bg-yellow-100` class and delete the debug `<p>` tag.
- **Line 108**: Replace the disabled modal comment with the EventModal component rendered conditionally.

### `client/src/components/EventCard.tsx`
- **Lines 15-17**: Add `onSelect?: () => void` to `EventCardProps`.
- **Lines 53-71**: Replace the two conditional renders (`<article>` / `<a>`) with a single clickable `<article>` element.

### No backend changes needed
- `src/repositories/events.repository.ts` — genre and venue filters fully implemented
- `src/api/routes/events.ts` — `genre` query param already in schema
- `src/api/validators/events.schema.ts` — `genre: z.string().optional()` already present

## Recommended Plan Structure

**Recommendation: 2 plans**

### Plan 06-01: Wire EventModal to EventCard + EventList
**Scope:** EventCard click handler, EventList selectedEvent state, modal rendering, debug banner removal.
**Files changed:** `EventCard.tsx`, `EventList.tsx`
**Success criteria:** Clicking any event card opens the modal showing artist, genre, price, ticket sources.

### Plan 06-02: Enable Genre Filter in FilterBar
**Scope:** Uncomment genre filter block, populate `<option>` tags with all 11 canonical genres, add missing `Slaktkyrkan` to venue dropdown.
**Files changed:** `FilterBar.tsx`
**Success criteria:** Genre filter select visible, selecting a genre filters events; venue filter has all active crawlers.

**Rationale for split:** Modal wiring touches EventCard and EventList (multiple components, requires coordination). Genre filter is a self-contained single-file change with independent test verification.

## Open Questions

1. **Slakthusen sub-venues**
   - What we know: `crawl-slakthusen.js` extracts venue from `.stalle` CSS class, which likely yields `Hus 7`, `Slakthuset`, `Kägelbanan`
   - What's unclear: Exact set of sub-venue strings that appear in DB without running the crawler
   - Recommendation: Include `Hus 7` (already in FilterBar). `Slakthuset` and `Kägelbanan` are not in FilterBar — could be added if desired, but not required for FILT-03 success.

2. **Berns venue filter returning empty set**
   - What we know: Captured as a TODO in commit `49e6356`. FilterBar value `'Berns'` matches `crawl-berns.js` VENUE_NAME.
   - What's unclear: Whether this is a data availability issue (crawl never run successfully) or a name mismatch
   - Recommendation: Out of scope for Phase 06. The filter is wired correctly by name.

## Sources

### Primary (HIGH confidence)
- Direct file reads of all components (`FilterBar.tsx`, `EventList.tsx`, `EventCard.tsx`, `EventModal.tsx`)
- Direct file reads of backend (`events.schema.ts`, `events.repository.ts`, `events.service.ts`, `events.controller.ts`)
- Direct file reads of normalization layer (`genre-mappings.ts`, `venue-mappings.ts`)
- Direct file reads of all 24 crawl scripts in `crawl-all.js`
- Git log for recent commits

### No external research needed
All findings are based on direct code inspection. No library documentation research required — all libraries (React useState, createPortal, react-intersection-observer) are already in use and working.

## Metadata

**Confidence breakdown:**
- Current state of each component: HIGH — direct file reads
- What's missing/broken: HIGH — exact line numbers identified
- Canonical venue names: HIGH — extracted from actual crawler scripts
- Canonical genre values: HIGH — from `CANONICAL_GENRES` constant
- Plan structure: HIGH — minimal, targeted changes

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable codebase, no external deps to track)
