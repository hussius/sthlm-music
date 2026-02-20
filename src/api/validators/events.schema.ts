import { z } from 'zod';

/**
 * Event filter query parameters schema.
 *
 * Supports comprehensive filtering:
 * - genre: Exact match on canonical genre
 * - dateFrom/dateTo: ISO 8601 date range filtering
 * - venue: Exact match on normalized venue name
 * - artistSearch: Case-insensitive partial match on artist field
 * - eventSearch: Case-insensitive partial match on event name field
 * - cursor: Pagination cursor (format: "date_id")
 * - limit: Page size (1-100, default 20)
 */
export const EventFiltersSchema = z.object({
  genre: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  venue: z.string().optional(),
  artistSearch: z.string().optional(),
  eventSearch: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

/**
 * Ticket source schema - represents one platform's ticket URL.
 */
export const TicketSourceSchema = z.object({
  platform: z.string(),
  url: z.string().url(),
  addedAt: z.string().datetime()
});

/**
 * Event schema - complete event data structure.
 */
export const EventSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  artist: z.string(),
  venue: z.string(),
  date: z.string().datetime(),
  time: z.string().nullable(),
  genre: z.string(),
  ticketSources: z.array(TicketSourceSchema),
  price: z.string().nullable()
});

/**
 * Events API response schema.
 *
 * Returns paginated events with cursor for loading next page.
 */
export const EventsResponseSchema = z.object({
  events: z.array(EventSchema),
  nextCursor: z.string().nullable()
});

// Export TypeScript types for use in controllers/services
export type EventFilters = z.infer<typeof EventFiltersSchema>;
export type TicketSource = z.infer<typeof TicketSourceSchema>;
export type EventResponse = z.infer<typeof EventSchema>;
export type EventsResponse = z.infer<typeof EventsResponseSchema>;
