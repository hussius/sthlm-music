---
created: 2026-02-28T15:50:12.911Z
title: Guard infinite scroll against filter side effects in new features
area: ui
files:
  - client/src/components/FilterBar.tsx
  - client/src/hooks/useFilterState.ts
---

## Problem

Infinite scroll has broken multiple times after adding new filter features to FilterBar.tsx. The root cause is always the same pattern: a `useEffect` that syncs state to URL search params fires on mount, causing `updateFilters()` → `setSearchParams()` → new `filters` object reference → TanStack Query sees a new queryKey → infinite scroll resets to page 1.

The fix (mount guards via `useRef`) has been applied twice now. The pattern needs to be documented so future contributors don't re-introduce the bug.

## Solution

Add a comment block near the top of FilterBar.tsx (or in a CLAUDE.md / dev note) that explicitly warns:

> **Infinite scroll invariant:** Any `useEffect` that calls `updateFilters()` MUST use a mount guard (`useRef`) to skip the first render. Without this, the effect fires on mount, resets the TanStack Query key, and breaks infinite scroll. See the `isArtistMounted` / `isEventMounted` refs for the established pattern.

Also consider adding a `useEffect` lint rule or a shared `useSyncToUrl` hook that encapsulates the mount-guard pattern so it can't be forgotten.
