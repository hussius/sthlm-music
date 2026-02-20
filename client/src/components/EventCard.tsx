/**
 * Event card component displaying full event details with ticket purchase links.
 *
 * Features:
 * - Displays all event information: name, artist, date/time, venue, genre, price
 * - Primary ticket button for first ticket source
 * - Badge showing additional platform count
 * - Mobile-responsive design (320px to 1920px+)
 * - Accessibility-first with ARIA labels and semantic HTML
 * - Deep links to ticket platform event pages
 */

import { formatEventDate } from '@/lib/date';
import type { EventResponse } from '@/types/events';

interface EventCardProps {
  event: EventResponse;
}

export function EventCard({ event }: EventCardProps) {
  const primaryTicket = event.ticketSources[0];
  const additionalPlatforms = event.ticketSources.length - 1;

  return (
    <article className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-blue-500">
      {/* Event name */}
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {event.name}
      </h3>

      {/* Artist */}
      <p className="text-sm text-gray-600 mb-3">
        {event.artist}
      </p>

      {/* Metadata row: date, venue, genre */}
      <div className="flex flex-col gap-2 mb-3 text-sm text-gray-700">
        <div className="flex items-center gap-1">
          <span aria-label="Date">📅</span>
          <span>{formatEventDate(event.date)}</span>
        </div>

        <div className="flex items-center gap-1">
          <span aria-label="Venue">📍</span>
          <span>{event.venue}</span>
        </div>

        <div className="flex items-center gap-1">
          <span aria-label="Genre">🎵</span>
          <span>{event.genre}</span>
        </div>
      </div>

      {/* Price */}
      {event.price && (
        <p className="text-sm font-medium text-gray-700 mb-3">
          {event.price}
        </p>
      )}

      {/* Ticket section */}
      {primaryTicket && (
        <div className="flex items-center gap-2 mt-4">
          <a
            href={primaryTicket.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Buy tickets on ${primaryTicket.platform}`}
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Buy Tickets on {primaryTicket.platform}
          </a>

          {additionalPlatforms > 0 && (
            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
              +{additionalPlatforms} more platform{additionalPlatforms > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </article>
  );
}
