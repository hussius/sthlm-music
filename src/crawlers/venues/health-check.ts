/**
 * Health monitoring for venue crawlers.
 *
 * Detects when venue crawlers stop working (Pitfall 7: venue website structure changes).
 *
 * Health determination:
 * - 'failing': No events captured in last 30 days
 * - 'warning': Less than 2 events per crawl average
 * - 'healthy': 2+ events per crawl average
 *
 * Usage:
 * ```typescript
 * import { checkAllVenuesHealth, formatHealthReport } from './health-check.js';
 * const statuses = await checkAllVenuesHealth();
 * console.log(formatHealthReport(statuses));
 * ```
 */

import { db } from '../../db/client.js';
import { events } from '../../db/schema.js';
import { sql, and, eq, gte } from 'drizzle-orm';

/**
 * Health status for a single venue crawler.
 */
export interface VenueHealthStatus {
  venue: string;
  status: 'healthy' | 'warning' | 'failing';
  lastSuccessfulCrawl: Date | null;
  recentSuccessRate: number; // 0-100
  averageEventsPerCrawl: number;
  lastError: string | null;
}

/**
 * Check health of a single venue crawler.
 *
 * Process:
 * 1. Query events from last 30 days for this venue
 * 2. Calculate average events per crawl (assume weekly = 4 crawls in 30 days)
 * 3. Determine status:
 *    - 0 events = failing (venue website changed or no events listed)
 *    - <2 avg = warning (low event count, may need investigation)
 *    - 2+ avg = healthy
 *
 * @param venueName - Normalized venue name (e.g., "Kollektivet Livet")
 * @returns Health status with metrics
 */
export async function checkVenueHealth(venueName: string): Promise<VenueHealthStatus> {
  // Check recent events from this venue
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentEvents = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.venue, venueName),
        eq(events.sourcePlatform, 'venue-direct'),
        gte(events.createdAt, thirtyDaysAgo)
      )
    );

  // Calculate health metrics
  const eventCount = recentEvents.length;
  const averageEventsPerCrawl = eventCount / 4; // Assume weekly crawls = 4 in 30 days

  // Determine status
  let status: 'healthy' | 'warning' | 'failing';
  if (eventCount === 0) {
    status = 'failing';
  } else if (averageEventsPerCrawl < 2) {
    status = 'warning';
  } else {
    status = 'healthy';
  }

  return {
    venue: venueName,
    status,
    lastSuccessfulCrawl: recentEvents[0]?.createdAt || null,
    recentSuccessRate: eventCount > 0 ? 100 : 0, // Simplified - would need crawl logs for accurate rate
    averageEventsPerCrawl,
    lastError: null, // Would need error logging system
  };
}

/**
 * Check health of all 13 priority venue crawlers.
 *
 * @returns Array of health statuses, one per venue
 */
export async function checkAllVenuesHealth(): Promise<VenueHealthStatus[]> {
  const venues = [
    'Kollektivet Livet',
    'Slaktkyrkan',
    'Hus 7',
    'Fasching',
    'Nalen',
    'Fylkingen',
    'Slakthuset',
    'Fållan',
    'Landet',
    'Mosebacke',
    'Kägelbanan',
    'Pet Sounds',
    'Debaser',
  ];

  const results = [];
  for (const venue of venues) {
    const health = await checkVenueHealth(venue);
    results.push(health);
  }

  return results;
}

/**
 * Format health statuses into human-readable report.
 *
 * @param statuses - Array of venue health statuses
 * @returns Formatted text report
 */
export function formatHealthReport(statuses: VenueHealthStatus[]): string {
  let report = 'Venue Crawler Health Report\n';
  report += '='.repeat(50) + '\n\n';

  for (const status of statuses) {
    const icon = status.status === 'healthy' ? '✓' : status.status === 'warning' ? '⚠' : '✗';

    report += `${icon} ${status.venue}\n`;
    report += `  Status: ${status.status}\n`;
    report += `  Avg events/crawl: ${status.averageEventsPerCrawl.toFixed(1)}\n`;
    report += `  Last crawl: ${status.lastSuccessfulCrawl?.toISOString() || 'never'}\n`;
    report += '\n';
  }

  const failing = statuses.filter((s) => s.status === 'failing').length;
  const warning = statuses.filter((s) => s.status === 'warning').length;
  const healthy = statuses.filter((s) => s.status === 'healthy').length;

  report += `Summary: ${healthy} healthy, ${warning} warning, ${failing} failing\n`;

  return report;
}
