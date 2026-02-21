/**
 * Ticketmaster crawler for Stockholm music events.
 *
 * Fetches events from Ticketmaster Discovery API within a 12-month window,
 * normalizes data, and stores in database.
 *
 * Features:
 * - 12-month rolling window (prevents stale data)
 * - Pagination handling (fetches all available events)
 * - Rate limiting (via TicketmasterClient)
 * - Progress logging every 10 pages
 * - Graceful error handling (continues on individual event failures)
 */

import { TicketmasterClient } from './ticketmaster-api-client.js';
import { transformTicketmasterEvent } from '../normalization/transformers.js';
import { upsertEvent } from '../repositories/event-repository.js';
import { config } from '../config/env.js';

/**
 * Crawl result summary.
 */
export interface CrawlResult {
  success: number;
  failed: number;
}

/**
 * Format date for Ticketmaster API (without milliseconds).
 * Ticketmaster requires: YYYY-MM-DDTHH:mm:ssZ
 */
function formatTicketmasterDate(date: Date): string {
  return date.toISOString().split('.')[0] + 'Z';
}

/**
 * Crawl Ticketmaster for Stockholm music events within the next 12 months.
 *
 * Process:
 * 1. Calculate 12-month window (now to now+12months)
 * 2. Fetch events page-by-page using Ticketmaster API
 * 3. Transform each event to normalized schema
 * 4. Upsert to database (handles duplicates gracefully)
 * 5. Continue until all pages fetched
 *
 * Rate limiting:
 * - Automatically enforced by TicketmasterClient (5 req/sec, 5000/day)
 * - Large crawls may take 10+ minutes due to rate limits
 *
 * Error handling:
 * - Individual event failures logged but don't stop crawl
 * - API errors (500, 429) throw and stop crawl
 * - Normalization failures counted as failed events
 *
 * @returns Summary with success/failed counts
 * @throws Error on API authentication or server errors
 */
export async function crawlTicketmaster(): Promise<CrawlResult> {
  const client = new TicketmasterClient(config.TICKETMASTER_API_KEY);

  // Calculate 12-month window
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 12);

  let success = 0;
  let failed = 0;
  let page = 0;
  const pageSize = 200; // Max allowed by Ticketmaster API

  console.log(`🚀 Starting Ticketmaster crawl for Stockholm music events`);
  console.log(`📅 Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

  try {
    while (true) {
      // Fetch page of events
      const response = await client.searchEvents({
        city: 'Stockholm',
        countryCode: 'SE',
        classificationName: 'Music',
        startDateTime: formatTicketmasterDate(startDate),
        endDateTime: formatTicketmasterDate(endDate),
        page,
        size: pageSize,
      });

      const rawEvents = response._embedded?.events || [];

      // No more events - pagination complete
      if (rawEvents.length === 0) {
        console.log(`✅ No more events found on page ${page}. Pagination complete.`);
        break;
      }

      console.log(`📄 Processing page ${page}: ${rawEvents.length} events`);

      // Process each event on this page
      for (const rawEvent of rawEvents) {
        try {
          // Transform to normalized schema
          const normalized = transformTicketmasterEvent(rawEvent);

          if (!normalized.success) {
            console.warn(`⚠️  Failed to normalize event ${rawEvent.id}:`, normalized.errors);
            failed++;
            continue;
          }

          // Store in database (upsert handles duplicates)
          await upsertEvent(normalized.data);
          success++;
        } catch (error) {
          console.error(`❌ Failed to process event ${rawEvent.id || 'unknown'}:`, error instanceof Error ? error.message : String(error));
          failed++;
        }
      }

      // Progress logging every 10 pages
      if (page > 0 && page % 10 === 0) {
        const quota = client.getQuotaUsage();
        console.log(`📊 Progress: ${success} saved, ${failed} failed (page ${page}). API quota: ${quota.used}/${quota.total} (${quota.percentUsed}%)`);
      }

      // Check if more pages exist
      if (page >= response.page.totalPages - 1) {
        console.log(`✅ Reached last page (${page + 1} of ${response.page.totalPages}). Crawl complete.`);
        break;
      }

      page++;
    }

    const quota = client.getQuotaUsage();
    console.log(`\n✅ Ticketmaster crawl complete: ${success} success, ${failed} failed`);
    console.log(`📊 API quota used: ${quota.used}/${quota.total} requests (${quota.percentUsed}%)`);

    return { success, failed };
  } catch (error) {
    console.error('❌ Ticketmaster crawl failed:', error instanceof Error ? error.message : String(error));
    console.error('Details:', { page, successSoFar: success, failedSoFar: failed });
    throw error;
  }
}
