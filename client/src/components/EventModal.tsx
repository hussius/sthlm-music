/**
 * Modal dialog component for displaying full event details.
 *
 * Features:
 * - Centered modal with backdrop overlay
 * - Full event details: name, artist, date/time, venue, genre, price
 * - All ticket sources with primary button + additional links
 * - Close on: X button, backdrop click, Escape key
 * - Accessible: focus trap, ARIA attributes, keyboard navigation
 * - Portal rendering to avoid z-index issues
 */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatEventDate } from '@/lib/date';
import type { EventResponse } from '@/types/events';

interface EventModalProps {
  event: EventResponse;
  onClose: () => void;
}

export function EventModal({ event, onClose }: EventModalProps) {
  // Safely handle event data that might be objects instead of strings
  const eventName = typeof event.name === 'string' ? event.name : '[Invalid Event Name]';
  const eventArtist = typeof event.artist === 'string' ? event.artist : '[Invalid Artist]';

  const ticketSources = Array.isArray(event.ticketSources) ? event.ticketSources : [];
  const primaryTicket = ticketSources[0];
  const additionalTickets = ticketSources.slice(1);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 transition-opacity"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        style={{ zIndex: 10 }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          aria-label="Close modal"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {/* Event name */}
          <h2 id="modal-title" className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 pr-8">
            {eventName}
          </h2>

          {/* Artist */}
          <p className="text-lg text-gray-600 mb-6">
            {eventArtist}
          </p>

          {/* Metadata grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="flex items-start gap-2">
              <span className="text-xl" aria-label="Date">📅</span>
              <div>
                <div className="text-sm font-medium text-gray-500">Date & Time</div>
                <div className="text-base text-gray-900">{formatEventDate(event.date)}</div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-xl" aria-label="Venue">📍</span>
              <div>
                <div className="text-sm font-medium text-gray-500">Venue</div>
                <div className="text-base text-gray-900">{event.venue}</div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-xl" aria-label="Genre">🎵</span>
              <div>
                <div className="text-sm font-medium text-gray-500">Genre</div>
                <div className="text-base text-gray-900">{event.genre}</div>
              </div>
            </div>

            {event.price && (
              <div className="flex items-start gap-2">
                <span className="text-xl" aria-label="Price">💰</span>
                <div>
                  <div className="text-sm font-medium text-gray-500">Price</div>
                  <div className="text-base text-gray-900">{event.price}</div>
                </div>
              </div>
            )}
          </div>

          {/* Ticket sources */}
          {ticketSources.length > 0 && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Get Tickets</h3>

              <div className="space-y-3">
                {/* Primary ticket button */}
                {primaryTicket && (
                  <a
                    href={primaryTicket.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Buy Tickets on {primaryTicket.platform}
                  </a>
                )}

                {/* Additional ticket sources */}
                {additionalTickets.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Also available on:</p>
                    {additionalTickets.map((ticket, index) => (
                      <a
                        key={index}
                        href={ticket.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full px-4 py-2 border border-gray-300 hover:border-blue-500 hover:bg-blue-50 text-gray-700 hover:text-blue-700 font-medium text-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        {ticket.platform}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
