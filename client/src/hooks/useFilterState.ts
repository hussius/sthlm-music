import { useSearchParams } from 'react-router-dom';
import type { EventFilters } from '@/types/events';

/**
 * URL-based filter state management hook.
 * Uses URL search params as single source of truth for filter state.
 *
 * Pattern: URL changes trigger React Router state update → component re-render
 * → TanStack Query with new key → API fetch with new filters.
 */
export function useFilterState() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Build filters object from URL params
  const filters: EventFilters = {
    genre: searchParams.get('genre') || undefined,
    venue: searchParams.get('venue') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    artistSearch: searchParams.get('artistSearch') || undefined,
    eventSearch: searchParams.get('eventSearch') || undefined,
    organizerSearch: searchParams.get('organizerSearch') || undefined,
    // cursor and limit handled by useEvents, not exposed to filters
  };

  const updateFilters = (updates: Partial<EventFilters>) => {
    const newParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        newParams.set(key, String(value));
      } else {
        newParams.delete(key);
      }
    });

    setSearchParams(newParams);
  };

  return { filters, updateFilters };
}
