/**
 * Cleanup job for maintaining 12-month rolling event window.
 *
 * Features:
 * - Deletes events older than 12 months
 * - Prevents database from growing indefinitely
 * - Ensures users only see upcoming events
 * - Runs weekly on Sundays at 4 AM
 */

import { db } from '../db/client.js';
import { events } from '../db/schema.js';
import { lt } from 'drizzle-orm';

/**
 * Clean up events older than 12 months.
 *
 * Process:
 * 1. Calculate cutoff date (12 months ago)
 * 2. Delete events with date < cutoff
 * 3. Return deletion count
 *
 * Note: reviewQueue table cleanup removed - table doesn't exist yet
 *
 * @returns Object with deleted count
 */
export async function cleanupOldEvents(): Promise<{ deleted: number }> {
  // Calculate cutoff date (12 months ago)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  console.log(`Cleaning up events older than ${twelveMonthsAgo.toISOString()}`);

  // Delete old events
  const eventResult = await db.delete(events)
    .where(lt(events.date, twelveMonthsAgo))
    .returning({ id: events.id });

  const deletedCount = eventResult.length;

  console.log(`Deleted ${deletedCount} events older than 12 months`);

  return { deleted: deletedCount };
}

/**
 * Get event counts by age for monitoring.
 *
 * Provides visibility into:
 * - Total events in database
 * - Events within 12-month window
 * - Events past 12-month window (should be 0 after cleanup)
 *
 * @returns Object with event count breakdown
 */
export async function getEventCountsByAge(): Promise<{
  total: number;
  withinWindow: number;
  pastWindow: number;
}> {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const allEvents = await db.select().from(events);
  const total = allEvents.length;

  const withinWindow = allEvents.filter(e => e.date >= twelveMonthsAgo).length;
  const pastWindow = total - withinWindow;

  return { total, withinWindow, pastWindow };
}

/**
 * Force immediate cleanup for testing/debugging.
 *
 * Runs cleanup and logs before/after statistics.
 * Useful for verifying cleanup logic without waiting for scheduled job.
 */
export async function forceCleanup(): Promise<void> {
  console.log('Force cleanup triggered');

  const counts = await getEventCountsByAge();
  console.log('Before cleanup:', counts);

  const result = await cleanupOldEvents();
  console.log('Cleanup result:', result);

  const countsAfter = await getEventCountsByAge();
  console.log('After cleanup:', countsAfter);
}
