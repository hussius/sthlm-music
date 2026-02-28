/**
 * React Query hook for fetching events for a given date range.
 *
 * Uses a simple query (not infinite scroll) — month-based pagination
 * is handled by the FilterBar month navigator.
 */

import { useQuery } from '@tanstack/react-query';
import { fetchEvents } from '../api/events';
import type { EventFilters } from '../types/events';

export function useEvents(filters: EventFilters = {}) {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: () => fetchEvents({ ...filters, limit: 500 }),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}
