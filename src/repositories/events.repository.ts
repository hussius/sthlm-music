/**
 * Events repository with comprehensive filtering and cursor pagination.
 *
 * Supports:
 * - Date range filtering (gte/lte on date index)
 * - Genre filtering (eq on genre index)
 * - Venue filtering (eq on venue index)
 * - Artist search (ilike with GIN trigram index)
 * - Event name search (ilike with GIN trigram index)
 * - Cursor-based pagination (O(1) performance at any depth)
 */

import { eq, gte, lte, ilike, and, or, gt } from 'drizzle-orm';
import { events, type Event } from '../db/schema.js';
import { db } from '../db/client.js';

/**
 * Event filter parameters for findByFilters query.
 *
 * All filters are optional and can be combined:
 * - Date range: dateFrom/dateTo (ISO date strings)
 * - Category: genre (exact match)
 * - Location: venue (exact match)
 * - Search: artistSearch/eventSearch (case-insensitive partial match)
 * - Pagination: cursor (format "date_id") and limit (1-100, default 20)
 */
export interface EventFilters {
  genre?: string;
  dateFrom?: string;  // ISO date string
  dateTo?: string;    // ISO date string
  venue?: string;
  artistSearch?: string;
  eventSearch?: string;
  cursor?: string;    // Format: "date_id" (e.g., "2024-03-15T19:00:00Z_uuid")
  limit?: number;     // Default 20, max 100
}

/**
 * Response from findByFilters with pagination metadata.
 */
export interface EventsResponse {
  events: Event[];
  nextCursor: string | null;
}

/**
 * Parse cursor string into date and ID components.
 *
 * Cursor format: "ISO_DATE_UUID"
 * Example: "2024-03-15T19:00:00.000Z_550e8400-e29b-41d4-a716-446655440000"
 *
 * @param cursor - Cursor string from previous page
 * @returns Object with parsed date and id
 */
function parseCursor(cursor: string): { date: Date; id: string } {
  const lastUnderscoreIndex = cursor.lastIndexOf('_');
  if (lastUnderscoreIndex === -1) {
    throw new Error('Invalid cursor format: missing underscore separator');
  }

  const dateStr = cursor.substring(0, lastUnderscoreIndex);
  const id = cursor.substring(lastUnderscoreIndex + 1);

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid cursor format: invalid date "${dateStr}"`);
  }

  return { date, id };
}

/**
 * Build cursor string from date and ID.
 *
 * @param date - Event date
 * @param id - Event UUID
 * @returns Cursor string for next page
 */
function buildCursor(date: Date, id: string): string {
  return `${date.toISOString()}_${id}`;
}

/**
 * Events repository class.
 *
 * Provides comprehensive event filtering with database-level optimization:
 * - Uses existing B-tree indexes for date, genre, venue filters
 * - Uses GIN trigram indexes for artist/event name search
 * - Implements cursor pagination for O(1) performance
 */
export class EventsRepository {
  /**
   * Find events by multiple filter criteria with cursor pagination.
   *
   * Query optimization:
   * - All filters applied at database level (no in-memory filtering)
   * - Uses appropriate indexes for each filter type
   * - Cursor pagination avoids OFFSET performance degradation
   * - Fetches limit+1 to determine if more pages exist
   *
   * @param filters - Filter and pagination parameters
   * @returns Paginated events with nextCursor for loading more
   */
  async findByFilters(filters: EventFilters): Promise<EventsResponse> {
    const conditions = [];
    const limit = Math.min(filters.limit || 20, 100); // Default 20, max 100

    // Genre filter (exact match, uses B-tree index)
    if (filters.genre) {
      conditions.push(eq(events.genre, filters.genre));
    }

    // Date range filter (uses B-tree index)
    if (filters.dateFrom) {
      conditions.push(gte(events.date, new Date(filters.dateFrom)));
    }
    if (filters.dateTo) {
      conditions.push(lte(events.date, new Date(filters.dateTo)));
    }

    // Venue filter (exact match, uses unique index)
    if (filters.venue) {
      conditions.push(eq(events.venue, filters.venue));
    }

    // Artist search (case-insensitive, uses GIN trigram index)
    if (filters.artistSearch) {
      conditions.push(ilike(events.artist, `%${filters.artistSearch}%`));
    }

    // Event name search (case-insensitive, uses GIN trigram index)
    if (filters.eventSearch) {
      conditions.push(ilike(events.name, `%${filters.eventSearch}%`));
    }

    // Cursor pagination
    // Format: "date_id" ensures consistent ordering across pages
    // Uses composite condition: date > cursor_date OR (date = cursor_date AND id > cursor_id)
    if (filters.cursor) {
      try {
        const { date: cursorDate, id: cursorId } = parseCursor(filters.cursor);
        conditions.push(
          or(
            gt(events.date, cursorDate),
            and(eq(events.date, cursorDate), gt(events.id, cursorId))
          )
        );
      } catch (error) {
        throw new Error(`Invalid cursor: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Execute query
    // Fetch limit+1 to determine if more results exist
    const results = await db
      .select()
      .from(events)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(events.date, events.id) // Consistent ordering for pagination
      .limit(limit + 1); // Fetch extra to check if more exist

    // Build response with pagination metadata
    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, -1) : results;
    const nextCursor = hasMore && items.length > 0
      ? buildCursor(items[items.length - 1].date, items[items.length - 1].id)
      : null;

    // Transform Date objects to ISO strings for API response
    const transformedEvents = items.map(event => ({
      ...event,
      date: event.date.toISOString(),
      ticketSources: Array.isArray(event.ticketSources)
        ? event.ticketSources.map((source: any) => ({
            ...source,
            addedAt: typeof source.addedAt === 'string' ? source.addedAt : new Date(source.addedAt).toISOString()
          }))
        : []
    })) as any; // Type assertion: we transform Date to string for API compatibility

    return {
      events: transformedEvents,
      nextCursor,
    };
  }
}

/**
 * Singleton events repository instance.
 *
 * Usage:
 * ```ts
 * import { eventsRepository } from './repositories/events.repository.js';
 *
 * const result = await eventsRepository.findByFilters({
 *   genre: 'rock',
 *   dateFrom: '2024-03-01',
 *   limit: 20
 * });
 * ```
 */
export const eventsRepository = new EventsRepository();
