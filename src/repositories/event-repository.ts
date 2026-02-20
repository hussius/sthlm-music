/**
 * Event repository for database operations.
 *
 * Handles event storage with upsert logic based on (venue, date) unique constraint.
 * Updates existing events if found, inserts new ones otherwise.
 */

import { db } from '../db/client.js';
import { events, type NewEvent } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
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
      // Update existing event
      const [updated] = await db
        .update(events)
        .set({
          ...event,
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
