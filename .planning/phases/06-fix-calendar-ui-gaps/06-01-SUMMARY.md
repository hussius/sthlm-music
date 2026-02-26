---
phase: 06-fix-calendar-ui-gaps
plan: 01
subsystem: ui
tags: [react, typescript, event-modal, infinite-scroll, accessibility]

# Dependency graph
requires:
  - phase: 03-calendar-ui-public-launch
    provides: EventModal.tsx fully implemented but unwired; EventCard with direct ticket URL navigation; EventList with debug banner
provides:
  - EventModal wired into EventList via selectedEvent state and onSelect callback
  - EventCard converted to unified clickable article with keyboard accessibility
  - Debug yellow banner removed from infinite scroll trigger
affects: [06-fix-calendar-ui-gaps, 06-02]

# Tech tracking
tech-stack:
  added: []
  patterns: [modal-via-state-callback, onSelect-prop-pattern, accessible-article-button]

key-files:
  created: []
  modified:
    - client/src/components/EventList.tsx
    - client/src/components/EventCard.tsx

key-decisions:
  - "EventCard no longer navigates directly to ticket URL — modal handles all ticket interactions"
  - "selectedEvent state lives in EventList (not App or context) — modal is scoped to the list"
  - "EventCard uses article element with role=button pattern for keyboard accessibility without wrapping in a link"

patterns-established:
  - "onSelect callback pattern: parent owns state, child fires callback on interaction"
  - "Keyboard accessibility via onKeyDown Enter/Space on non-anchor interactive elements"

requirements-completed: [DISP-02, DISP-03]

# Metrics
duration: 20min
completed: 2026-02-26
---

# Phase 6 Plan 01: Wire EventModal Summary

**EventModal wired into EventList via onSelect callback on EventCard; debug yellow banner removed from infinite scroll trigger while preserving intersection observer ref**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-02-26T00:00:00Z
- **Completed:** 2026-02-26T00:20:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- EventModal now opens on any event card click, showing artist, genre, price, and all ticket sources
- EventCard converted from dual-render anchor/div pattern to a single unified clickable article with full keyboard accessibility (Enter, Space, Tab)
- Debug yellow banner (`bg-yellow-100`) removed from infinite scroll trigger div; `ref={ref}` preserved so pagination continues to work

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove debug banner and wire EventModal state in EventList** - `13044ea` (feat)
2. **Task 2: Make EventCard a clickable article for modal trigger** - `13044ea` (feat)

**Plan metadata:** (docs commit — this run)

## Files Created/Modified
- `client/src/components/EventList.tsx` - Added useState + EventModal import, selectedEvent state, onSelect prop on EventCard, conditional EventModal render, removed yellow debug banner
- `client/src/components/EventCard.tsx` - Updated EventCardProps to include onSelect, removed ticketUrl variable and direct anchor navigation, unified into single clickable article with keyboard accessibility

## Decisions Made
- EventCard no longer navigates directly to ticket URL — all ticket interaction is handled inside EventModal. This ensures users see all ticket sources (DISP-03), not just the first one.
- selectedEvent state lives in EventList rather than being hoisted to App or a context provider — keeps the modal scoped to the list and avoids unnecessary re-renders.
- Used article element with role=button and onKeyDown rather than wrapping in a button or anchor — semantically correct for a card that acts as an interactive container.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- DISP-02 and DISP-03 closed: users can now see full event details and all ticket sources via the modal
- 06-02 (genre filter) is unblocked and can proceed independently
- Infinite scroll continues working; no regression introduced

---
*Phase: 06-fix-calendar-ui-gaps*
*Completed: 2026-02-26*
