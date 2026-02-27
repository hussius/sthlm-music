/**
 * Zod schemas for event validation and transformation.
 *
 * Provides:
 * - EventSchema: Validates and transforms raw event data
 * - normalizeEventData: Helper function for ergonomic validation
 * - Type-safe Event type inferred from schema
 *
 * Schema design:
 * - Enforces data quality (required fields, valid URLs, future dates)
 * - Transforms data during validation (venue normalization, genre mapping)
 * - Provides clear error messages for invalid data
 *
 * @example
 * const result = normalizeEventData(rawScrapedData);
 * if (result.success) {
 *   await db.insert(events).values(result.data);
 * } else {
 *   logger.error('Validation failed', result.errors);
 * }
 */

import { z } from 'zod';
import { CANONICAL_GENRES, mapGenre } from './genre-mappings.js';
import { normalizeVenueName } from './venue-mappings.js';
import { isBlocklisted } from './event-filters.js';

/**
 * Ticket source schema - validates individual ticket platform entries
 */
export const TicketSourceSchema = z.object({
  platform: z.string().min(1, 'Platform required'),
  url: z.string().url('Invalid ticket URL'),
  addedAt: z.string().datetime('Invalid timestamp'),
});

/**
 * Event schema with validation and transformation.
 *
 * Validation rules:
 * - name: 1-500 characters (trimmed)
 * - artist: 1-500 characters (trimmed)
 * - venue: Transformed via normalizeVenueName (handles variations)
 * - date: Must be in future (prevents parsing errors)
 * - time: Optional (not all events have specific time)
 * - genre: Must be canonical genre OR transformed via mapGenre
 * - ticketSources: Array of ticket source objects (platform, url, addedAt)
 * - price: Optional (not always available)
 * - sourceId: Required (for deduplication)
 * - sourcePlatform: One of 4 supported platforms
 *
 * Why dates must be in future:
 * - Prevents date parsing errors (e.g., "2026-02-30" would parse to past)
 * - Catches scraper bugs early (wrong timezone, wrong format)
 * - System maintains 12-month rolling window, so past events are irrelevant
 *
 * Why venues are transformed:
 * - Enables deduplication across platforms
 * - "Kollektivet" and "Kollektivet Livet" are the same venue
 * - Without normalization, fuzzy matching would need lower thresholds (more false positives)
 *
 * Why genres use enum OR transform:
 * - Handles known canonical genres directly (fast path)
 * - Handles unknown genres gracefully via mapGenre (maps to closest canonical)
 * - Never rejects valid event due to unknown genre
 */
export const EventSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Event name required')
    .max(500, 'Event name too long')
    .refine((n) => !isBlocklisted(n), { message: 'Non-concert event blocked by content filter' }),
  artist: z.string().trim().min(1, 'Artist name required').max(500, 'Artist name too long'),
  venue: z.string().trim().transform(normalizeVenueName),
  date: z.coerce
    .date()
    .refine((d) => d > new Date(), { message: 'Event must be in future' }),
  time: z.string().optional(),
  genre: z
    .enum(CANONICAL_GENRES)
    .or(z.string().transform(mapGenre)),
  ticketSources: z.array(TicketSourceSchema).min(1, 'At least one ticket source required'),
  price: z.string().optional(),
  sourceId: z.string().min(1, 'Source ID required'),
  sourcePlatform: z.enum(['ticketmaster', 'axs', 'dice', 'venue-direct']),
});

/**
 * Inferred TypeScript type from EventSchema.
 * Use for type-safe database operations and function signatures.
 */
export type Event = z.infer<typeof EventSchema>;

/**
 * Validation result type.
 * Success: { success: true, data: Event }
 * Failure: { success: false, errors: ZodError }
 */
export type NormalizedEventResult =
  | { success: true; data: Event }
  | { success: false; errors: any };

/**
 * Validates and normalizes raw event data.
 *
 * Process:
 * 1. Parse with EventSchema.safeParse
 * 2. If success: return { success: true, data }
 * 3. If error: return { success: false, errors: flattened error object }
 *
 * Flattened errors make it easy to identify which field failed:
 * ```
 * {
 *   fieldErrors: {
 *     name: ['Event name required'],
 *     date: ['Event must be in future']
 *   }
 * }
 * ```
 *
 * @param raw - Raw event data from any platform
 * @returns Validation result with normalized data or detailed errors
 */
export function normalizeEventData(raw: unknown): NormalizedEventResult {
  const result = EventSchema.safeParse(raw);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error.flatten() };
  }
}
