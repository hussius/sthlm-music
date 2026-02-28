/**
 * Klubb Död event crawler.
 *
 * Klubb Död is a traveling organizer (not a fixed venue) hosting events at
 * rotating locations. This crawler hardcodes organizer: 'Klubb Död' so fans
 * can filter by organizer regardless of which venue hosts the event.
 *
 * Strategy:
 * 1. Fetch homepage — collect all /event/ links
 * 2. Visit each event page — parse JSON-LD structured data for details
 * 3. Normalize + save via deduplicateAndSave
 *
 * Site: https://klubbdod.se
 */

import { CheerioCrawler, log } from 'crawlee';
import { transformVenueEvent } from '../../normalization/transformers.js';
import { deduplicateAndSave } from '../../deduplication/deduplicator.js';

const BASE_URL = 'https://klubbdod.se';
const ORGANIZER = 'Klubb Död';

/**
 * Parse JSON-LD structured data from a page's <script> tags.
 * Returns the first Event-type JSON-LD object found, or null.
 */
function parseJsonLd($: any): any | null {
  let found: any = null;
  $('script[type="application/ld+json"]').each((_: number, el: any) => {
    if (found) return;
    try {
      const data = JSON.parse($(el).html() || '{}');
      // JSON-LD may be a single object or an array of objects
      const items: any[] = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'Event' || item['@type'] === 'MusicEvent') {
          found = item;
          break;
        }
      }
    } catch {
      // ignore parse errors
    }
  });
  return found;
}

export async function crawlKlubbDod(): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  // Collect event page URLs from the homepage listing
  const eventUrls: string[] = [];

  const listingCrawler = new CheerioCrawler({
    maxConcurrency: 1,
    requestHandlerTimeoutSecs: 30,
    requestHandler: async ({ $, request }) => {
      log.info(`Klubb Död listing: ${request.url}`);

      // Collect all links matching /event/ pattern
      $('a[href]').each((_: number, el: any) => {
        const href = $(el).attr('href') || '';
        // Match relative or absolute event links
        const abs = href.startsWith('http') ? href : `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`;
        if (abs.includes(BASE_URL) && /\/event\/[^/]+\/?$/.test(abs)) {
          if (!eventUrls.includes(abs)) {
            eventUrls.push(abs);
          }
        }
      });

      log.info(`Klubb Död: found ${eventUrls.length} event links`);
    },
  });

  await listingCrawler.run([BASE_URL]);

  if (eventUrls.length === 0) {
    log.warning('Klubb Död: no event links found on homepage');
    return { success: 0, failed: 0 };
  }

  // Visit each event page and extract details from JSON-LD
  const eventCrawler = new CheerioCrawler({
    maxConcurrency: 2,
    requestHandlerTimeoutSecs: 30,
    requestHandler: async ({ $, request }) => {
      log.info(`Klubb Död event page: ${request.url}`);

      const jsonLd = parseJsonLd($);

      // Fallbacks if JSON-LD is absent
      const name = jsonLd?.name || $('h1').first().text().trim() || $('h2').first().text().trim();
      const startDate = jsonLd?.startDate;
      const addressLocality: string = jsonLd?.location?.address?.addressLocality || '';

      // Skip non-Stockholm events (Klubb Död also hosts events in Göteborg etc.)
      if (addressLocality && !addressLocality.toLowerCase().includes('stockholm')) {
        log.info(`Klubb Död: skipping non-Stockholm event at ${request.url} (${addressLocality})`);
        return;
      }

      const venueName = jsonLd?.location?.name || jsonLd?.location?.address?.streetAddress || 'Unknown Venue';
      const price = jsonLd?.offers?.price
        ? `${jsonLd.offers.price} ${jsonLd.offers.priceCurrency || 'SEK'}`
        : undefined;

      // Ticket URL: prefer JSON-LD offers.url, else find "Köp biljetter" link
      let ticketUrl = jsonLd?.offers?.url || jsonLd?.url;
      if (!ticketUrl) {
        $('a').each((_: number, el: any) => {
          const text = $(el).text().trim().toLowerCase();
          if (!ticketUrl && (text.includes('biljetter') || text.includes('ticket'))) {
            const href = $(el).attr('href') || '';
            if (href.startsWith('http')) ticketUrl = href;
          }
        });
      }
      // Fall back to the event page URL itself
      if (!ticketUrl) ticketUrl = request.url;

      if (!name || !startDate) {
        log.warning(`Klubb Död: missing name or date on ${request.url}`);
        failed++;
        return;
      }

      const sourceId = `klubbdod-${request.url.replace(/[^a-z0-9]/gi, '-')}`;

      const normalized = transformVenueEvent({
        name,
        artist: name,
        venue: venueName,
        date: startDate,
        genre: 'electronic', // Klubb Död focuses on dark electronic / post-punk
        url: ticketUrl,
        price,
        id: sourceId,
        organizer: ORGANIZER,
      });

      if (!normalized.success) {
        log.warning(`Klubb Död: normalization failed for ${request.url}:`, (normalized as any).errors);
        failed++;
        return;
      }

      try {
        await deduplicateAndSave(normalized.data as any);
        success++;
      } catch (error) {
        log.error(`Klubb Död: save failed for ${request.url}:`, {
          error: error instanceof Error ? error.message : String(error),
        });
        failed++;
      }
    },
  });

  await eventCrawler.run(eventUrls);

  log.info(`Klubb Död crawl complete: ${success} success, ${failed} failed`);
  return { success, failed };
}
