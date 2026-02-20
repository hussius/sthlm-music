/**
 * Event list component with infinite scroll pagination.
 *
 * Features:
 * - Displays events in chronological order
 * - Automatic infinite scroll using intersection observer
 * - Loading states with skeleton cards
 * - Error handling with user-friendly messages
 * - Stockholm timezone for all dates
 */

import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { useEvents } from '../hooks/useEvents';
import { useFilterState } from '../hooks/useFilterState';
import { EventCard } from './EventCard';
import { SkeletonCard } from './SkeletonCard';
import type { EventResponse } from '../types/events';

export function EventList() {
  const { ref, inView } = useInView();
  const { filters } = useFilterState();
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useEvents(filters);

  // Trigger next page load when scroll trigger is in view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Loading state - show skeleton cards
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4" role="list">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <h3 className="text-lg font-semibold mb-2">Failed to load events. Please try again.</h3>
        <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error occurred'}</p>
      </div>
    );
  }

  // Get all events from all pages
  const allEvents = data?.pages.flatMap((page) => page.events) ?? [];

  // Empty state
  if (allEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-gray-600 mb-2">No events found</p>
        <p className="text-sm text-gray-500">Try adjusting your filters</p>
      </div>
    );
  }

  // Success state - render event list
  return (
    <div className="flex flex-col gap-4" role="list">
      {allEvents.map((event: EventResponse) => (
        <EventCard key={event.id} event={event} />
      ))}

      {/* Infinite scroll trigger */}
      <div ref={ref} className="py-5 text-center">
        {isFetchingNextPage && (
          <p className="text-gray-600">Loading more events...</p>
        )}
      </div>
    </div>
  );
}
