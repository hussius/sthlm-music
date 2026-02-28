/**
 * Event types matching Phase 2 API schema.
 * These types align with src/api/validators/events.schema.ts
 */

export interface EventFilters {
  genre?: string;
  dateFrom?: string;
  dateTo?: string;
  venue?: string;
  artistSearch?: string;
  eventSearch?: string;
  organizerSearch?: string;
  cursor?: string;
  limit?: number;
}

export interface TicketSource {
  platform: string;
  url: string;
  addedAt: string;
}

export interface EventResponse {
  id: string;
  name: string;
  artist: string;
  venue: string;
  date: string;
  time: string | null;
  genre: string;
  ticketSources: TicketSource[];
  price: string | null;
  organizer: string | null;
}

export interface EventsResponse {
  events: EventResponse[];
  nextCursor: string | null;
}
