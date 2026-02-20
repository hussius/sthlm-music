import { PlaywrightCrawler, log } from 'crawlee';
import { transformDICEEvent } from '../normalization/transformers.js';
import { upsertEvent } from '../repositories/event-repository.js';
import { config } from '../config/env.js';

const DICE_STOCKHOLM_URL = 'https://dice.fm/city/stockholm/events';
const DEBUG = process.env.DEBUG === 'true';

/**
 * Helper function to parse DICE date formats with time
 */
function parseDICEDateTime(dateStr: string, timeStr?: string): Date {
  // Already ISO format
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }

  // Relative dates
  if (dateStr.toLowerCase().includes('tonight')) {
    const tonight = new Date();
    tonight.setHours(20, 0, 0, 0);
    return tonight;
  }

  if (dateStr.toLowerCase().includes('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(20, 0, 0, 0);
    return tomorrow;
  }

  // Parse "FRI 15 JUN" format with optional time
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const parts = dateStr.toLowerCase().match(/(\d+)\s+(\w+)/);

  if (parts) {
    const day = parseInt(parts[1]);
    const monthIndex = months.findIndex(m => parts[2].startsWith(m));
    const year = new Date().getFullYear();

    if (monthIndex !== -1) {
      const date = new Date(year, monthIndex, day);

      // Add time if provided
      if (timeStr) {
        const timeMatch = timeStr.match(/(\d+):(\d+)/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          date.setHours(hours, minutes);
        }
      }

      return date;
    }
  }

  // Standard date parsing
  return new Date(dateStr);
}

/**
 * Crawl DICE website for Stockholm music events
 */
export async function crawlDICE(): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  const crawler = new PlaywrightCrawler({
    maxConcurrency: config.CRAWL_CONCURRENCY,
    requestHandlerTimeoutSecs: 90,  // Longer timeout for infinite scroll
    maxRequestRetries: 3,

    requestHandler: async ({ page, request }) => {
      log.info(`Processing DICE page: ${request.url}`);

      // Wait for initial events to load
      try {
        await page.waitForSelector('[data-testid="event-card"], .event-card, .event-item', {
          timeout: 15000
        });
      } catch (error) {
        log.error(`Failed to load DICE events: ${error}`);
        return;
      }

      // Handle infinite scroll if present
      let previousEventCount = 0;
      let currentEventCount = 0;
      let scrollAttempts = 0;
      const maxScrollAttempts = 20;  // Limit to prevent infinite loops

      while (scrollAttempts < maxScrollAttempts) {
        currentEventCount = await page.locator('[data-testid="event-card"], .event-card, .event-item').count();

        log.info(`Scroll attempt ${scrollAttempts}: ${currentEventCount} events loaded`);

        // If count hasn't changed, we've reached the end
        if (currentEventCount === previousEventCount) {
          break;
        }

        previousEventCount = currentEventCount;

        // Scroll to bottom
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

        // Wait for new events to load - use network idle or fallback to timeout
        await Promise.race([
          page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {}),
          page.waitForTimeout(2000)  // Fallback
        ]);

        // Check for "loading" indicator
        const isLoading = await page.locator('.loading, .spinner, [data-testid="loading"]').count();
        if (isLoading > 0) {
          await page.waitForSelector('.loading, .spinner, [data-testid="loading"]', {
            state: 'hidden',
            timeout: 10000
          }).catch(() => {
            log.warning('Loading indicator did not disappear');
          });
        }

        // Debug mode: take screenshot
        if (DEBUG) {
          await page.screenshot({ path: `./storage/dice-scroll-${scrollAttempts}.png` });
        }

        scrollAttempts++;
      }

      log.info(`Finished scrolling. Total events loaded: ${currentEventCount}`);

      // Debug mode: log first event HTML
      if (DEBUG) {
        const firstEventHTML = await page.$eval('[data-testid="event-card"], .event-card, .event-item', el => el.outerHTML).catch(() => 'No events found');
        log.debug('First event HTML:', { html: firstEventHTML });
      }

      // Extract all events
      const rawEvents = await page.$$eval(
        '[data-testid="event-card"], .event-card, .event-item',
        (elements) => elements.map(el => {
          // Extract event data
          const nameEl = el.querySelector('[data-testid="event-name"], .event-name, h2, h3');
          const artistEl = el.querySelector('[data-testid="artist-name"], .artist-name, .performer');
          const venueEl = el.querySelector('[data-testid="venue"], .venue-name, .location');
          const dateEl = el.querySelector('time, [data-testid="event-date"], .event-date');
          const genreEl = el.querySelector('[data-testid="genre"], .genre, .category');
          const linkEl = el.querySelector('a[href*="/event/"], a[href*="/events/"]') as HTMLAnchorElement | null;
          const priceEl = el.querySelector('[data-testid="price"], .price');

          const url = linkEl?.href;
          return {
            name: nameEl?.textContent?.trim(),
            artist: artistEl?.textContent?.trim(),
            venue: venueEl?.textContent?.trim(),
            date: dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim(),
            genre: genreEl?.textContent?.trim(),
            url: url,
            price: priceEl?.textContent?.trim(),
            id: url?.split('/').pop()
          };
        })
      );

      log.info(`Extracted ${rawEvents.length} raw events from DICE`);

      // Filter and normalize events
      for (const rawEvent of rawEvents) {
        if (!rawEvent.name || !rawEvent.url) {
          log.warning('Skipping incomplete DICE event:', rawEvent);
          failed++;
          continue;
        }

        // Ensure we have Stockholm events
        const isStockholm =
          rawEvent.venue?.toLowerCase().includes('stockholm') ||
          request.url.includes('stockholm');

        if (!isStockholm && rawEvent.venue) {
          log.debug(`Skipping non-Stockholm event: ${rawEvent.venue}`);
          continue;
        }

        const normalized = transformDICEEvent({
          ...rawEvent,
          id: rawEvent.id || `dice-${Date.now()}-${Math.random()}`,
          venue: rawEvent.venue || 'Stockholm Venue',
          artist: rawEvent.artist || rawEvent.name
        });

        if (!normalized.success) {
          log.warning('Failed to normalize DICE event:', normalized.errors);
          failed++;
          continue;
        }

        try {
          await upsertEvent(normalized.data);
          success++;
        } catch (error) {
          log.error('Failed to save DICE event:', {
            error: error instanceof Error ? error.message : String(error)
          });
          failed++;
        }
      }
    },

    failedRequestHandler: async ({ request, log }) => {
      log.error(`DICE request failed after retries: ${request.url}`);
      failed++;
    }
  });

  await crawler.run([DICE_STOCKHOLM_URL]);

  log.info(`DICE crawl complete: ${success} success, ${failed} failed`);
  return { success, failed };
}
