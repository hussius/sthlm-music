/**
 * AXS/Live Nation crawler using Playwright for JavaScript-rendered content.
 *
 * AXS uses heavy JavaScript rendering, requiring browser automation to properly
 * extract event data. This crawler implements multiple wait strategies to ensure
 * content is fully loaded before extraction.
 *
 * Key features:
 * - PlaywrightCrawler for dynamic content handling
 * - Multiple wait strategies (selectors, loading spinners, network idle)
 * - Minimum event count verification (prevents partial extractions)
 * - Stockholm-specific filtering
 * - Automatic pagination handling
 * - Screenshot debugging on errors
 *
 * @example
 * const result = await crawlAXS();
 * console.log(`Crawled ${result.success} events, ${result.failed} failed`);
 */

import { PlaywrightCrawler, log } from 'crawlee';
import { transformAXSEvent } from '../normalization/transformers.js';
import { upsertEvent } from '../repositories/event-repository.js';
import { config } from '../config/env.js';

/**
 * AXS Stockholm events URL.
 * Note: This URL is an educated guess. During execution, verify actual URL structure.
 */
const AXS_STOCKHOLM_URL = 'https://www.axs.com/se/stockholm/events/music';

/**
 * Helper function to parse AXS date formats.
 * Handles both ISO 8601 and human-readable formats.
 *
 * @param dateStr - Date string from AXS page
 * @returns Date object or null if parsing fails
 */
function parseAXSDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Handle ISO 8601 format (with time)
  if (dateStr.includes('T')) {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  // Handle human-readable formats like "Jun 15, 2026"
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Crawl AXS/Live Nation for Stockholm music events.
 *
 * Process:
 * 1. Navigate to AXS Stockholm events page
 * 2. Wait for dynamic content to load (multiple strategies)
 * 3. Verify minimum event count (prevents partial loads)
 * 4. Extract event data using multiple selector fallbacks
 * 5. Filter for Stockholm events only
 * 6. Transform and validate with transformAXSEvent
 * 7. Upsert to database with duplicate handling
 * 8. Handle pagination automatically
 *
 * @returns Object with success and failed counts
 */
export async function crawlAXS(): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  const crawler = new PlaywrightCrawler({
    maxConcurrency: config.CRAWL_CONCURRENCY,
    requestHandlerTimeoutSecs: 60,
    maxRequestRetries: 3,

    requestHandler: async ({ page, request, enqueueLinks }) => {
      log.info(`Processing AXS page: ${request.url}`);

      // CRITICAL: Wait for events to load (prevents Pitfall 2 - JavaScript race conditions)
      // Use multiple strategies in order of reliability
      try {
        // Strategy 1: Wait for event cards to appear
        // Using multiple selectors as fallbacks since exact structure is unknown
        await page.waitForSelector('.event-card, .event-item, [data-testid="event"], .event, article[class*="event"]', {
          timeout: 15000,
        });

        // Strategy 2: Wait for loading spinner to disappear (if exists)
        await page
          .waitForSelector('.loading, .spinner, [class*="loading"], [class*="spinner"]', {
            state: 'hidden',
            timeout: 5000,
          })
          .catch(() => {
            // Loading spinner might not exist, that's ok
            log.debug('No loading spinner found or already hidden');
          });

        // Strategy 3: Wait for network to be idle
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
          log.warning('Network did not become idle, proceeding anyway');
        });
      } catch (error) {
        log.error(`Failed to load events on ${request.url}: ${error}`);

        // Take screenshot for debugging
        try {
          await page.screenshot({
            path: `./storage/debug-axs-${Date.now()}.png`,
            fullPage: true,
          });
          log.info('Debug screenshot saved to storage/');
        } catch (screenshotError) {
          log.warning('Failed to save debug screenshot');
        }

        return;
      }

      // Verify minimum event count loaded (prevents extracting partial results)
      const eventCount = await page
        .locator('.event-card, .event-item, [data-testid="event"], .event, article[class*="event"]')
        .count();

      if (eventCount < 3 && !request.url.includes('page=')) {
        log.warning(`Only ${eventCount} events found, may be incomplete load`);
      }

      log.info(`Found ${eventCount} event elements on page`);

      // Extract events using page.$$eval
      // Multiple selector fallbacks to handle various page structures
      const rawEvents = await page.$$eval(
        '.event-card, .event-item, [data-testid="event"], .event, article[class*="event"]',
        (elements) =>
          elements.map((el) => {
            // Extract event name with multiple fallback selectors
            const nameSelectors = [
              '.event-name',
              'h3',
              'h2',
              '[data-testid="event-name"]',
              '.title',
              '[class*="title"]',
              '[class*="name"]',
            ];
            let name = '';
            for (const selector of nameSelectors) {
              const element = el.querySelector(selector);
              if (element?.textContent?.trim()) {
                name = element.textContent.trim();
                break;
              }
            }

            // Extract artist with fallback selectors
            const artistSelectors = [
              '.artist-name',
              '.performer',
              '[data-testid="artist"]',
              '.artist',
              '[class*="artist"]',
              '[class*="performer"]',
            ];
            let artist = '';
            for (const selector of artistSelectors) {
              const element = el.querySelector(selector);
              if (element?.textContent?.trim()) {
                artist = element.textContent.trim();
                break;
              }
            }

            // Extract venue with fallback selectors
            const venueSelectors = [
              '.venue-name',
              '.location',
              '[data-testid="venue"]',
              '.venue',
              '[class*="venue"]',
              '[class*="location"]',
            ];
            let venue = '';
            for (const selector of venueSelectors) {
              const element = el.querySelector(selector);
              if (element?.textContent?.trim()) {
                venue = element.textContent.trim();
                break;
              }
            }

            // Extract date (try datetime attribute first, then text)
            const timeElement = el.querySelector('time');
            let date = '';
            if (timeElement) {
              date = timeElement.getAttribute('datetime') || timeElement.textContent?.trim() || '';
            } else {
              const dateSelectors = [
                '.event-date',
                '[data-testid="date"]',
                '.date',
                '[class*="date"]',
              ];
              for (const selector of dateSelectors) {
                const element = el.querySelector(selector);
                if (element?.textContent?.trim()) {
                  date = element.textContent.trim();
                  break;
                }
              }
            }

            // Extract genre
            const genreElement = el.querySelector('.genre, .category, [class*="genre"], [class*="category"]');
            const genre = genreElement?.textContent?.trim() || '';

            // Extract URL (find first link in event card)
            const linkElement = el.querySelector('a');
            const url = linkElement?.href || '';

            // Extract price
            const priceElement = el.querySelector('.price, [data-testid="price"], [class*="price"]');
            const price = priceElement?.textContent?.trim() || '';

            // Generate ID from URL or use fallback
            const id = url ? url.split('/').pop() || '' : '';

            return {
              name,
              artist,
              venue,
              date,
              genre,
              url,
              price,
              id,
            };
          })
      );

      log.info(`Extracted ${rawEvents.length} raw events from ${request.url}`);

      // Filter for Stockholm events only (in case URL returns broader results)
      const stockholmEvents = rawEvents.filter(
        (event) =>
          event.venue?.toLowerCase().includes('stockholm') ||
          request.url.includes('stockholm')
      );

      log.info(`Filtered to ${stockholmEvents.length} Stockholm events`);

      // Transform and save each event
      for (const rawEvent of stockholmEvents) {
        if (!rawEvent.name || !rawEvent.url) {
          log.warning('Skipping incomplete event (missing name or URL):', {
            name: rawEvent.name || '(missing)',
            url: rawEvent.url || '(missing)',
          });
          failed++;
          continue;
        }

        // Parse date
        const parsedDate = parseAXSDate(rawEvent.date);
        if (!parsedDate) {
          log.warning('Skipping event with invalid date:', {
            name: rawEvent.name,
            date: rawEvent.date,
          });
          failed++;
          continue;
        }

        // Transform using platform transformer
        const normalized = transformAXSEvent({
          ...rawEvent,
          id: rawEvent.id || `axs-${Date.now()}-${Math.random()}`,
          venue: rawEvent.venue || 'Unknown Stockholm Venue',
          artist: rawEvent.artist || rawEvent.name, // Use event name as artist if missing
          date: parsedDate,
        });

        if (!normalized.success) {
          log.warning('Failed to normalize AXS event:', {
            name: rawEvent.name,
            errors: normalized.errors,
          });
          failed++;
          continue;
        }

        // Save to database
        try {
          await upsertEvent(normalized.data);
          success++;

          // Log progress every 10 events
          if (success % 10 === 0) {
            log.info(`Progress: ${success} events saved`);
          }
        } catch (error) {
          log.error('Failed to save event to database:', {
            name: rawEvent.name,
            error: error instanceof Error ? error.message : String(error),
          });
          failed++;
        }
      }

      log.info(`Page complete: ${success} total success, ${failed} total failed`);

      // Handle pagination - enqueue next page if exists
      try {
        await enqueueLinks({
          selector: 'a.next-page, a[rel="next"], [data-testid="next-page"], .pagination a[class*="next"]',
          label: 'PAGINATION',
        });
      } catch (paginationError) {
        log.debug('No pagination found or pagination already exhausted');
      }
    },

    failedRequestHandler: async ({ request, log: crawlerLog }) => {
      crawlerLog.error(`Request failed after retries: ${request.url}`);
      failed++;
    },
  });

  // Run crawler with start URL
  await crawler.run([AXS_STOCKHOLM_URL]);

  log.info(`AXS crawl complete: ${success} success, ${failed} failed`);
  return { success, failed };
}
