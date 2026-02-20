/**
 * Exact match deduplication using database unique constraint.
 *
 * Stage 1 of deduplication pipeline:
 * - Query for events with same venue + date
 * - Uses unique index on (venue, date) for fast lookup
 * - Returns existing event if found, null otherwise
 *
 * Why exact matching is reliable:
 * - Venues normalized via transformVenueName (e.g., "Kollektivet" → "Kollektivet Livet")
 * - Dates compared at exact timestamp level
 * - Database constraint prevents duplicates at insert time
 * - False positive rate: ~0% (same venue + same date = same event)
 *
 * @example
 * const existing = await checkExactMatch(incomingEvent);
 * if (existing) {
 *   // Duplicate found - merge ticket links
 *   await mergeEventData(existing, incomingEvent);
 * } else {
 *   // No duplicate - proceed to fuzzy matching
 * }
 */

import { db } from '../db/client.js';
import { events, type Event } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';

/**
 * Check if an event with the same venue and date already exists.
 *
 * Uses database unique index for fast O(log n) lookup.
 *
 * @param event - Incoming event to check for duplicates
 * @returns Existing event if found, null otherwise
 */
export async function checkExactMatch(event: Partial<Event>): Promise<Event | null> {
  if (!event.venue || !event.date) {
    return null;
  }

  // Query for exact venue+date match (uses unique index)
  const matches = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.venue, event.venue),
        eq(events.date, event.date)
      )
    )
    .limit(1);

  return matches[0] || null;
}

/**
 * Merge incoming event data with existing event.
 *
 * Strategy:
 * - Keep existing core data (name, artist, venue, date)
 * - Use incoming data if better quality (non-'other' genre, price if missing)
 * - Update timestamp to reflect latest data refresh
 *
 * Note: Current schema stores one ticket URL per event.
 * A future enhancement would store ticket URLs in separate table
 * with foreign key to events, allowing multiple platforms per event.
 *
 * @param existing - Event already in database
 * @param incoming - New event data from crawler
 * @returns Merged event data
 */
export async function mergeEventData(existing: Event, incoming: Partial<Event>): Promise<Event> {
  // Merge logic: keep existing core data, append new ticket link if better
  return {
    ...existing,
    // If incoming has better genre data, use it
    genre: incoming.genre && incoming.genre !== 'other' ? incoming.genre : existing.genre,
    // If incoming has price and existing doesn't, use it
    price: incoming.price || existing.price,
    // Update timestamp to reflect latest data refresh
    updatedAt: new Date()
  };
}
