/**
 * React Query hook for infinite scrolling events.
 *
 * Features:
 * - Infinite pagination with cursor-based loading
 * - All filters included in query key for proper cache invalidation
 * - Automatic refetch on filter changes
 * - 1 minute stale time to reduce unnecessary requests
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchEvents } from '../api/events';
import type { EventFilters } from '../types/events';

/**
 * Hook for fetching events with infinite scroll pagination.
 *
 * @param filters - Event filter parameters
 * @returns TanStack Query infinite query result with pagination helpers
 */
export function useEvents(filters: EventFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['events', filters],
    queryFn: ({ pageParam }) =>
      fetchEvents({
        ...filters,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false, // Avoid cursor issues on refetch
    retry: 1, // Limit retries so pagination errors surface quickly rather than stalling for 30s
  });
}
