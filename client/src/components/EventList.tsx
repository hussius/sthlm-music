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
import { formatEventDate } from '../lib/date';
import { SkeletonCard } from './SkeletonCard';
import type { EventResponse } from '../types/events';

export function EventList() {
  const { ref, inView } = useInView();
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useEvents({});

  // Trigger next page load when scroll trigger is in view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Loading state - show skeleton cards
  if (isLoading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '20px',
        }}
      >
        <div
          style={{
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            padding: '16px',
            color: '#c00',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Error loading events</h3>
          <p>{error instanceof Error ? error.message : 'Unknown error occurred'}</p>
        </div>
      </div>
    );
  }

  // Get all events from all pages
  const allEvents = data?.pages.flatMap((page) => page.events) ?? [];

  // Empty state
  if (allEvents.length === 0) {
    return (
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '20px',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#666', fontSize: '18px' }}>No events found</p>
      </div>
    );
  }

  // Success state - render event list
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div role="list">
        {allEvents.map((event: EventResponse) => (
          <div
            key={event.id}
            style={{
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '16px',
              backgroundColor: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '20px' }}>
              {event.name}
            </h3>
            <p style={{ margin: '4px 0', color: '#333', fontSize: '16px' }}>
              <strong>Artist:</strong> {event.artist}
            </p>
            <p style={{ margin: '4px 0', color: '#555', fontSize: '14px' }}>
              <strong>Date:</strong> {formatEventDate(event.date)}
            </p>
            <p style={{ margin: '4px 0', color: '#555', fontSize: '14px' }}>
              <strong>Venue:</strong> {event.venue}
            </p>
            <p style={{ margin: '4px 0', color: '#555', fontSize: '14px' }}>
              <strong>Genre:</strong> {event.genre}
            </p>
            {event.price && (
              <p style={{ margin: '4px 0', color: '#555', fontSize: '14px' }}>
                <strong>Price:</strong> {event.price}
              </p>
            )}
            {event.ticketSources.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <strong style={{ fontSize: '14px', color: '#555' }}>Tickets:</strong>
                {event.ticketSources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      marginLeft: '8px',
                      color: '#0066cc',
                      textDecoration: 'underline',
                      fontSize: '14px',
                    }}
                  >
                    {source.platform}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Infinite scroll trigger */}
      <div ref={ref} style={{ padding: '20px', textAlign: 'center' }}>
        {isFetchingNextPage && (
          <p style={{ color: '#666' }}>Loading more events...</p>
        )}
      </div>
    </div>
  );
}
