/**
 * Event list component.
 *
 * Renders all events for the selected month. Pagination is handled by the
 * FilterBar month navigator (← Month →) — no infinite scroll.
 */

import { useEvents } from '../hooks/useEvents';
import { useFilterState } from '../hooks/useFilterState';
import { EventCard } from './EventCard';
import { SkeletonCard } from './SkeletonCard';
import type { EventResponse } from '../types/events';

export function EventList() {
  const { filters } = useFilterState();
  const { data, isLoading, isError, error } = useEvents(filters);

  if (isLoading) {
    return (
      <div
        className="gap-4"
        role="list"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <h3 className="text-lg font-semibold mb-2">Failed to load events. Please try again.</h3>
        <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error occurred'}</p>
      </div>
    );
  }

  const events = data?.events ?? [];

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-gray-600 mb-2">No events found</p>
        <p className="text-sm text-gray-500">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div
      className="gap-4"
      role="list"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
    >
      {events.map((event: EventResponse) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
