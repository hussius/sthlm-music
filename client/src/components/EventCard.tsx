/**
 * Compact event card component for grid display.
 *
 * Features:
 * - Compact design showing only essential info (name, date, venue, time)
 * - Click to open modal with full details
 * - Hover states for interactivity
 * - Keyboard accessible
 * - Truncated event names (max 2 lines)
 */

import { formatCompactDate } from '@/lib/date';
import type { EventResponse } from '@/types/events';

interface EventCardProps {
  event: EventResponse;
}

export function EventCard({ event }: EventCardProps) {
  // Safely handle event name that might be an object
  const eventName = typeof event.name === 'string' ? event.name : '[Invalid Event Name]';
  const ticketUrl = event.ticketSources[0]?.url;

  const cardContent = (
    <>
      {/* Date badge and event name */}
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 flex-1">
          {eventName}
        </h3>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded ml-2 whitespace-nowrap flex-shrink-0">
          {formatCompactDate(event.date)}
        </span>
      </div>

      {/* Venue and time */}
      <div className="text-xs text-gray-600 space-y-1">
        <div className="flex items-center gap-1">
          <span aria-label="Venue">📍</span>
          <span className="truncate">{event.venue}</span>
        </div>
        {event.time && (
          <div className="flex items-center gap-1">
            <span aria-label="Time">🕐</span>
            <span>{event.time}</span>
          </div>
        )}
      </div>
    </>
  );

  // If no ticket URL, render as non-clickable article
  if (!ticketUrl) {
    return (
      <article className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm">
        {cardContent}
      </article>
    );
  }

  // Render as clickable link
  return (
    <a
      href={ticketUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-gray-200 rounded-lg p-3 bg-white shadow-sm hover:shadow-md hover:border-blue-400 transition-all"
    >
      {cardContent}
    </a>
  );
}
