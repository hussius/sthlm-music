/**
 * Base venue crawler template using Strategy Pattern.
 *
 * Provides reusable crawling logic for venue websites with configurable selectors.
 * Supports both static (Cheerio) and dynamic (Playwright) sites.
 *
 * Design:
 * - VenueConfig defines venue-specific selectors and URL
 * - BaseVenueCrawler handles crawling logic (extract, normalize, save)
 * - Automatically chooses Cheerio or Playwright based on config
 * - Normalizes events via transformVenueEvent
 * - Saves to database via deduplicateAndSave (3-stage deduplication pipeline)
 *
 * Usage:
 * ```typescript
 * const config: VenueConfig = {
 *   name: 'Kollektivet Livet',
 *   url: 'https://kollektivetlivet.se/evenemang',
 *   selectors: { ... },
 *   usesJavaScript: false
 * };
 * const crawler = new BaseVenueCrawler(config);
 * const result = await crawler.crawl();
 * ```
 */

import { CheerioCrawler, PlaywrightCrawler, log } from 'crawlee';
import { transformVenueEvent } from '../../normalization/transformers.js';
import { deduplicateAndSave } from '../../deduplication/deduplicator.js';

/**
 * Venue configuration interface.
 * Defines all settings needed to crawl a specific venue's website.
 */
export interface VenueConfig {
  name: string;
  organizer?: string;
  url: string;
  selectors: {
    eventContainer: string;
    eventName: string;
    eventDate: string;
    eventTime?: string;
    eventGenre?: string;
    eventPrice?: string;
    eventUrl: string;
  };
  usesJavaScript: boolean; // true = Playwright, false = Cheerio
  dateFormat?: string; // e.g., 'dd/MM/yyyy' for parsing
}

/**
 * Base venue crawler using configurable selectors.
 *
 * Process:
 * 1. Choose crawler type (Cheerio for static, Playwright for dynamic)
 * 2. Extract events using configured selectors
 * 3. Normalize via transformVenueEvent
 * 4. Save via deduplicateAndSave (3-stage deduplication pipeline)
 * 5. Return success/failed counts
 */
export class BaseVenueCrawler {
  constructor(private config: VenueConfig) {}

  async crawl(): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    // Choose crawler based on whether site uses JavaScript
    const CrawlerClass = this.config.usesJavaScript ? PlaywrightCrawler : CheerioCrawler;

    const crawler = new CrawlerClass({
      maxConcurrency: 1, // Be gentle with small venue sites
      requestHandlerTimeoutSecs: 30,

      requestHandler: async (context: any) => {
        const { $, page, request } = context;

        log.info(`Crawling ${this.config.name}: ${request.url}`);

        // Wait for content if using Playwright
        if (page) {
          await page
            .waitForSelector(this.config.selectors.eventContainer, {
              timeout: 10000,
            })
            .catch(() => {
              log.warning(`Event container not found for ${this.config.name}`);
            });
        }

        // Extract events (handle both Cheerio and Playwright)
        let eventElements;
        if ($) {
          // Cheerio path
          eventElements = $(this.config.selectors.eventContainer);
        } else if (page) {
          // Playwright path
          eventElements = await page.$$(this.config.selectors.eventContainer);
        }

        if (!eventElements || eventElements.length === 0) {
          log.warning(`No events found for ${this.config.name}`);
          return;
        }

        log.info(`Found ${eventElements.length} event elements for ${this.config.name}`);

        // Extract data from each event
        const rawEvents = [];
        if ($) {
          // Cheerio extraction
          eventElements.each((i: number, el: any) => {
            const $el = $(el);
            rawEvents.push({
              name: $el.find(this.config.selectors.eventName).text().trim(),
              date: $el.find(this.config.selectors.eventDate).text().trim(),
              time: this.config.selectors.eventTime
                ? $el.find(this.config.selectors.eventTime).text().trim()
                : undefined,
              genre: this.config.selectors.eventGenre
                ? $el.find(this.config.selectors.eventGenre).text().trim()
                : undefined,
              price: this.config.selectors.eventPrice
                ? $el.find(this.config.selectors.eventPrice).text().trim()
                : undefined,
              url: $el.find(this.config.selectors.eventUrl).attr('href'),
            });
          });
        } else if (page) {
          // Playwright extraction
          for (const el of eventElements) {
            const name = await el
              .$eval(this.config.selectors.eventName, (e: any) => e.textContent?.trim())
              .catch(() => null);
            const date = await el
              .$eval(this.config.selectors.eventDate, (e: any) => e.textContent?.trim())
              .catch(() => null);
            const urlEl = await el.$(this.config.selectors.eventUrl);
            const url = urlEl ? await urlEl.getAttribute('href') : null;

            const genre = this.config.selectors.eventGenre
              ? await el.$eval(this.config.selectors.eventGenre, (e: any) => e.textContent?.trim()).catch(() => undefined)
              : undefined;
            const price = this.config.selectors.eventPrice
              ? await el.$eval(this.config.selectors.eventPrice, (e: any) => e.textContent?.trim()).catch(() => undefined)
              : undefined;

            rawEvents.push({ name, date, url, venue: this.config.name, genre, price });
          }
        }

        log.info(`Extracted ${rawEvents.length} events from ${this.config.name}`);

        // Normalize and save events
        for (const rawEvent of rawEvents) {
          if (!rawEvent.name || !rawEvent.url) {
            failed++;
            continue;
          }

          // Make URL absolute if relative
          let fullUrl = rawEvent.url;
          if (fullUrl && !fullUrl.startsWith('http')) {
            const baseUrl = new URL(this.config.url);
            fullUrl = new URL(fullUrl, baseUrl.origin).href;
          }

          const normalized = transformVenueEvent({
            name: rawEvent.name,
            artist: rawEvent.name, // Venue events often don't separate artist/event
            venue: this.config.name,
            date: rawEvent.date,
            genre: rawEvent.genre || 'other',
            url: fullUrl,
            price: rawEvent.price,
            id: `${this.config.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            organizer: this.config.organizer,
          });

          if (!normalized.success) {
            log.warning(`Failed to normalize event from ${this.config.name}:`, (normalized as any).errors);
            failed++;
            continue;
          }

          try {
            await deduplicateAndSave(normalized.data as any);
            success++;
          } catch (error) {
            log.error(`Failed to save event from ${this.config.name}:`, {
              error: error instanceof Error ? error.message : String(error)
            });
            failed++;
          }
        }
      },
    });

    await crawler.run([this.config.url]);

    log.info(`${this.config.name} crawl complete: ${success} success, ${failed} failed`);
    return { success, failed };
  }
}
