/**
 * Stockholm Live venue crawler (Avicii Arena + Annexet).
 *
 * Both venues share identical WordPress/schema.org structure:
 * 1. Listing page at /evenemang/musik-show/ — server-rendered, all events on one page
 * 2. Each event page has a MusicEvent JSON-LD script tag with full details
 *
 * Sites covered:
 * - https://aviciiarena.se  (Avicii Arena / Globen)
 * - https://annexet.se      (Annexet)
 */

import { CheerioCrawler, log } from 'crawlee';
import { transformVenueEvent } from '../../normalization/transformers.js';
import { deduplicateAndSave } from '../../deduplication/deduplicator.js';

const SITES = [
  { base: 'https://aviciiarena.se', venueName: 'Avicii Arena' },
  { base: 'https://annexet.se',     venueName: 'Annexet' },
];

const LISTING_SUFFIX = '/evenemang/musik-show/';

const SWEDISH_MONTHS: Record<string, number> = {
  januari: 0, februari: 1, mars: 2, april: 3, maj: 4, juni: 5,
  juli: 6, augusti: 7, september: 8, oktober: 9, november: 10, december: 11,
};

/**
 * Parse a Swedish date string like "14 mars 2026" into an ISO date string.
 */
function parseSwedishDate(text: string): string | null {
  const m = text.match(/(\d{1,2})\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)\s+(\d{4})/i);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = SWEDISH_MONTHS[m[2].toLowerCase()];
  const year = parseInt(m[3], 10);
  const d = new Date(year, month, day, 20, 0, 0); // default 20:00
  return d.toISOString();
}

/**
 * Fallback HTML extraction for event pages without MusicEvent JSON-LD.
 * Looks for Swedish date text, h1 title, and AXS ticket links.
 */
function extractFromHtml($: any, siteBase: string, pageUrl: string): { name: string; startDate: string; ticketUrl: string } | null {
  const name = $('h1').first().text().trim();
  if (!name) return null;

  // Look for Swedish date pattern anywhere in the page text
  const bodyText = $('body').text();
  const startDate = parseSwedishDate(bodyText);
  if (!startDate) return null;

  // Prefer AXS ticket link, fall back to page URL
  let ticketUrl = pageUrl;
  $('a[href]').each((_: number, el: any) => {
    const href = ($( el).attr('href') || '').trim();
    if (!ticketUrl.includes('axs.com') && href.includes('axs.com')) {
      ticketUrl = href;
    }
  });

  return { name, startDate, ticketUrl };
}

/**
 * Parse the first Event/MusicEvent from all JSON-LD script tags on a page.
 * Handles top-level object, top-level array, and @graph format.
 */
function parseJsonLd($: any): any | null {
  let found: any = null;
  $('script[type="application/ld+json"]').each((_: number, el: any) => {
    if (found) return;
    try {
      const data = JSON.parse($(el).html() || '{}');
      // Normalise to array: handle bare object, array, and @graph
      const items: any[] = Array.isArray(data)
        ? data
        : data['@graph']
        ? data['@graph']
        : [data];
      for (const item of items) {
        if (item['@type'] === 'Event' || item['@type'] === 'MusicEvent') {
          found = item;
          break;
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });
  return found;
}

export async function crawlStockholmLive(): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const site of SITES) {
    const listingUrl = `${site.base}${LISTING_SUFFIX}`;
    const eventUrls: string[] = [];

    // Step 1: collect event page links from the musik-show listing
    const listingCrawler = new CheerioCrawler({
      maxConcurrency: 1,
      requestHandlerTimeoutSecs: 30,
      requestHandler: async ({ $, request }) => {
        log.info(`Stockholm Live listing: ${request.url}`);

        $('a[href]').each((_: number, el: any) => {
          const href = ($(el).attr('href') || '').trim();
          const abs = href.startsWith('http')
            ? href
            : `${site.base}${href.startsWith('/') ? '' : '/'}${href}`;

          // Only collect musik-show event pages from this site
          if (
            abs.startsWith(site.base) &&
            /\/evenemang\/musik-show\/[^/]+\/?$/.test(abs) &&
            !eventUrls.includes(abs)
          ) {
            eventUrls.push(abs);
          }
        });

        log.info(`Stockholm Live (${site.venueName}): found ${eventUrls.length} event links`);
      },
    });

    await listingCrawler.run([listingUrl]);

    if (eventUrls.length === 0) {
      log.warning(`Stockholm Live: no event links found for ${site.venueName}`);
      continue;
    }

    // Step 2: visit each event page and extract MusicEvent JSON-LD
    const eventCrawler = new CheerioCrawler({
      maxConcurrency: 2,
      requestHandlerTimeoutSecs: 30,
      requestHandler: async ({ $, request }) => {
        log.info(`Stockholm Live event page: ${request.url}`);

        const jsonLd = parseJsonLd($);

        let name: string;
        let startDate: string;
        let venueName: string;
        let artist: string;
        let ticketUrl: string;
        let price: string | undefined;

        if (jsonLd) {
          name = jsonLd.name || $('h1').first().text().trim();
          startDate = jsonLd.startDate;
          venueName = jsonLd.location?.name || site.venueName;
          artist = jsonLd.performer?.name || name;
          const offers = jsonLd.offers;
          ticketUrl = offers?.url || jsonLd.url || request.url;
          price = offers?.lowPrice
            ? `${offers.lowPrice}–${offers.highPrice ?? offers.lowPrice} ${offers.priceCurrency || 'SEK'}`
            : offers?.price
            ? `${offers.price} ${offers.priceCurrency || 'SEK'}`
            : undefined;
        } else {
          // Fallback: extract from HTML for pages without MusicEvent JSON-LD
          const html = extractFromHtml($, site.base, request.url);
          if (!html) {
            log.warning(`Stockholm Live: no usable event data on ${request.url}`);
            failed++;
            return;
          }
          name = html.name;
          startDate = html.startDate;
          venueName = site.venueName;
          artist = name;
          ticketUrl = html.ticketUrl;
          price = undefined;
          log.info(`Stockholm Live: used HTML fallback for ${name}`);
        }

        if (!name || !startDate) {
          log.warning(`Stockholm Live: missing name or date on ${request.url}`);
          failed++;
          return;
        }

        const sourceId = `stockholm-live-${request.url.replace(/[^a-z0-9]/gi, '-')}`;

        const normalized = transformVenueEvent({
          name,
          artist,
          venue: venueName,
          date: startDate,
          genre: 'pop', // Stockholm Live venues host mainstream pop/rock
          url: ticketUrl,
          price,
          id: sourceId,
        });

        if (!normalized.success) {
          log.warning(
            `Stockholm Live: normalization failed for ${request.url}:`,
            (normalized as any).errors,
          );
          failed++;
          return;
        }

        try {
          await deduplicateAndSave(normalized.data as any);
          success++;
        } catch (error) {
          log.error(`Stockholm Live: save failed for ${request.url}:`, {
            error: error instanceof Error ? error.message : String(error),
          });
          failed++;
        }
      },
    });

    await eventCrawler.run(eventUrls);
  }

  log.info(`Stockholm Live crawl complete: ${success} success, ${failed} failed`);
  return { success, failed };
}
