/**
 * Event repository for database operations.
 *
 * Handles event storage with upsert logic based on (venue, date) unique constraint.
 * Updates existing events if found, inserts new ones otherwise.
 */

import { db } from '../db/client.js';
import { events, type NewEvent, type TicketSource } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { log } from 'crawlee';

/**
 * Upsert an event into the database.
 *
 * Uses the (venue, date) unique constraint for deduplication:
 * - If event exists with same venue+date: update all fields
 * - Otherwise: insert new event
 *
 * @param event - Normalized event data to store
 * @returns Database event record with ID
 */
export async function upsertEvent(event: NewEvent) {
  try {
    // Check if event exists with same venue+date
    const existing = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.venue, event.venue),
          eq(events.date, event.date)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing event with ticket source merging
      // Merge ticket sources: keep existing, add new platforms
      const existingPlatforms = new Set(existing[0].ticketSources.map((s: TicketSource) => s.platform));
      const newSources = event.ticketSources.filter(s => !existingPlatforms.has(s.platform));
      const mergedTicketSources = [...existing[0].ticketSources, ...newSources];

      const [updated] = await db
        .update(events)
        .set({
          ...event,
          ticketSources: mergedTicketSources,
          updatedAt: new Date(),
        })
        .where(eq(events.id, existing[0].id))
        .returning();

      log.debug(`Updated existing event: ${event.name} at ${event.venue}`);
      return updated;
    } else {
      // Insert new event
      const [inserted] = await db
        .insert(events)
        .values(event)
        .returning();

      log.debug(`Inserted new event: ${event.name} at ${event.venue}`);
      return inserted;
    }
  } catch (error) {
    log.error(`Failed to upsert event ${event.name}:`, {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Save an event to the database (wrapper around upsertEvent).
 *
 * @param event - Normalized event data to store
 * @returns true if saved successfully, false on error
 */
export async function saveEvent(event: NewEvent): Promise<boolean> {
  try {
    await upsertEvent(event);
    return true;
  } catch (error) {
    log.error('Failed to save event:', {
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

/**
 * Get an event by its ID.
 *
 * Used by deduplication pipeline to fetch existing event for ticket source merging.
 *
 * @param id - Event UUID
 * @returns Event if found, null otherwise
 */
export async function getEventById(id: string) {
  const result = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  return result[0] || null;
}

/**
 * Check if an event exists by source ID and platform.
 *
 * Used for:
 * - Avoiding unnecessary API calls for known events
 * - Checking if event has been deleted on source platform
 *
 * @param sourceId - Platform-specific event ID
 * @param sourcePlatform - Platform name (ticketmaster, axs, dice, venue-direct)
 * @returns true if event exists in database
 */
export async function eventExists(sourceId: string, sourcePlatform: string): Promise<boolean> {
  const result = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.sourceId, sourceId),
        eq(events.sourcePlatform, sourcePlatform)
      )
    )
    .limit(1);

  return result.length > 0;
}
