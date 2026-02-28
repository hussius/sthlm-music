import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { EventFilters } from '@/types/events';

/**
 * URL-based filter state management hook.
 * Uses URL search params as single source of truth for filter state.
 *
 * dateFrom/dateTo default to the current month if not present in URL,
 * so no mount effects or ref guards are needed to set initial state.
 */
export function useFilterState() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Default to current month start/end if not in URL
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

  const filters: EventFilters = {
    genre: searchParams.get('genre') || undefined,
    venue: searchParams.get('venue') || undefined,
    dateFrom: searchParams.get('dateFrom') || defaultFrom,
    dateTo: searchParams.get('dateTo') || defaultTo,
    artistSearch: searchParams.get('artistSearch') || undefined,
    eventSearch: searchParams.get('eventSearch') || undefined,
    organizerSearch: searchParams.get('organizerSearch') || undefined,
  };

  // Stable reference: setSearchParams is guaranteed stable by React Router,
  // and functional update form reads latest params at call time.
  const updateFilters = useCallback((updates: Partial<EventFilters>) => {
    setSearchParams((currentParams) => {
      const newParams = new URLSearchParams(currentParams);

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          newParams.set(key, String(value));
        } else {
          newParams.delete(key);
        }
      });

      return newParams;
    });
  }, [setSearchParams]);

  return { filters, updateFilters };
}
