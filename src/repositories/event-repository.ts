/**
 * Event repository for database operations.
 *
 * Handles event storage with upsert logic based on (venue, date) unique constraint.
 * Updates existing events if found, inserts new ones otherwise.
 */

import { db } from '../db/client.js';
import { events, type Event, type NewEvent } from '../db/schema.js';
import { eq, and, gte, lte } from 'drizzle-orm';
import { log } from 'crawlee';
import {
  classifySimilarity,
  hasSharedTicketUrl,
  mergeTicketSources,
  scoreEventSimilarity,
  ticketUrlSet,
} from '../deduplication/canonical.js';

function mergedEventUpdate(existing: Event, incoming: NewEvent) {
  return {
    genre: incoming.genre && incoming.genre !== 'other' ? incoming.genre : existing.genre,
    price: incoming.price || existing.price,
    organizer: incoming.organizer || existing.organizer,
    ticketSources: mergeTicketSources(existing.ticketSources, incoming.ticketSources),
    updatedAt: new Date(),
  };
}

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
    // Check by sourceId first — same API event can return with different timestamps
    const bySourceId = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.sourceId, event.sourceId),
          eq(events.sourcePlatform, event.sourcePlatform)
        )
      )
      .limit(1);

    if (bySourceId.length > 0) {
      const [updated] = await db
        .update(events)
        .set(mergedEventUpdate(bySourceId[0], event))
        .where(eq(events.id, bySourceId[0].id))
        .returning();
      log.debug(`Merged by sourceId: ${event.name}`);
      return updated;
    }

    // Same normalized ticket/event URL is a hard duplicate signal.
    if (ticketUrlSet(event).size > 0) {
      const allEvents = await db.select().from(events);
      const byUrl = allEvents.find((candidate) => hasSharedTicketUrl(event, candidate));
      if (byUrl) {
        const [updated] = await db
          .update(events)
          .set(mergedEventUpdate(byUrl, event))
          .where(eq(events.id, byUrl.id))
          .returning();
        log.debug(`Merged by ticket URL: ${event.name}`);
        return updated;
      }
    }

    // venue+date check
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
      const [updated] = await db
        .update(events)
        .set({
          ...mergedEventUpdate(existing[0], event),
        })
        .where(eq(events.id, existing[0].id))
        .returning();

      log.debug(`Merged by venue+date: ${event.name} at ${event.venue}`);
      return updated;
    }

    // Fuzzy pass for timestamp variants and cross-platform listings where names differ.
    const dayStart = new Date(event.date as Date);
    dayStart.setHours(dayStart.getHours() - 36);
    const dayEnd = new Date(event.date as Date);
    dayEnd.setHours(dayEnd.getHours() + 36);

    const nearby = await db
      .select()
      .from(events)
      .where(
        and(
          gte(events.date, dayStart),
          lte(events.date, dayEnd)
        )
      );

    for (const candidate of nearby) {
      const score = scoreEventSimilarity(event, candidate);
      if (classifySimilarity(score) === 'duplicate') {
        const [updated] = await db
          .update(events)
          .set(mergedEventUpdate(candidate, event))
          .where(eq(events.id, candidate.id))
          .returning();
        log.debug(
          `Merged by fuzzy identity: ${event.name} → ${candidate.name} ` +
          `(title=${score.titleSimilarity}, artist=${score.artistSimilarity}, venue=${score.venueSimilarity})`
        );
        return updated;
      }
    }

    // Genuinely new event
    const [inserted] = await db
      .insert(events)
      .values(event)
      .returning();

    log.debug(`Inserted new event: ${event.name} at ${event.venue}`);
    return inserted;
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
