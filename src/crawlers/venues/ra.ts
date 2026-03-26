/**
 * Resident Advisor (RA) GraphQL crawler for Stockholm live events.
 *
 * Uses RA's undocumented but stable GraphQL API at ra.co/graphql.
 * Fetches all live (concert/club) events in Stockholm (area 396),
 * paginating month by month up to 6 months ahead.
 *
 * Genre data comes directly from RA's genre tags — high quality.
 */

import { log } from 'crawlee';
import { normalizeEventData } from '../../normalization/schemas.js';
import { deduplicateAndSave } from '../../deduplication/deduplicator.js';

const RA_GRAPHQL = 'https://ra.co/graphql';
const STOCKHOLM_AREA_ID = 396;
const PAGE_SIZE = 100;

const HEADERS = {
  'Content-Type': 'application/json',
  'Referer': 'https://ra.co/events/se/stockholm',
  'User-Agent': 'Mozilla/5.0 (compatible; events-aggregator/1.0)',
};

const EVENTS_QUERY = `
  query GetStockholmEvents($filters: FilterInputDtoInput, $pageSize: Int, $page: Int) {
    eventListings(filters: $filters, pageSize: $pageSize, page: $page) {
      totalResults
      data {
        listingDate
        event {
          id
          title
          startTime
          venue { name }
          artists { name }
          genres { name }
          contentUrl
          cost
        }
      }
    }
  }
`;

function raGenreToCanonical(raGenres: string[]): string {
  const text = raGenres.join(' ').toLowerCase();
  if (/jazz/.test(text)) return 'jazz';
  if (/classical|ambient/.test(text)) return 'classical';
  if (/hip.?hop|rap/.test(text)) return 'hip-hop';
  if (/electro|techno|house|drum|dnb|bass|rave|club|trance|disco/.test(text)) return 'electronic';
  if (/folk|country/.test(text)) return 'folk';
  if (/metal|punk|hardcore/.test(text)) return 'metal';
  if (/rock|indie/.test(text)) return 'rock';
  if (/r&b|soul|funk/.test(text)) return 'pop';
  return 'electronic'; // RA is predominantly electronic
}

export async function crawlRA(): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  const today = new Date();
  const sixMonthsAhead = new Date(today);
  sixMonthsAhead.setMonth(sixMonthsAhead.getMonth() + 6);

  const dateFrom = today.toISOString().split('T')[0];
  const dateTo = sixMonthsAhead.toISOString().split('T')[0];

  let page = 1;
  let totalResults = Infinity;
  let fetched = 0;

  while (fetched < totalResults) {
    const res = await fetch(RA_GRAPHQL, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        query: EVENTS_QUERY,
        variables: {
          filters: {
            areas: { eq: STOCKHOLM_AREA_ID },
            listingDate: { gte: dateFrom, lte: dateTo },
            live: { eq: true },
          },
          pageSize: PAGE_SIZE,
          page,
        },
      }),
    });

    if (!res.ok) {
      log.error(`RA: API error ${res.status} on page ${page}`);
      break;
    }

    const json = await (res.json() as Promise<any>);
    const listings = json?.data?.eventListings;

    if (!listings) {
      log.error('RA: unexpected response shape');
      break;
    }

    totalResults = listings.totalResults ?? 0;
    const items: any[] = listings.data ?? [];

    if (items.length === 0) break;

    for (const listing of items) {
      const event = listing.event;
      if (!event) continue;

      const name: string = (event.title || '').trim();
      const startTime: string = event.startTime || listing.listingDate || '';
      const venue: string = (event.venue?.name || '').trim();
      const artists: string[] = (event.artists || []).map((a: any) => a.name).filter(Boolean);
      const artist: string = artists[0] || name;
      const raGenres: string[] = (event.genres || []).map((g: any) => g.name).filter(Boolean);
      const ticketUrl = event.contentUrl
        ? `https://ra.co${event.contentUrl}`
        : 'https://ra.co/events/se/stockholm';

      if (!name || !startTime || !venue) {
        failed++;
        continue;
      }

      const normalized = normalizeEventData({
        name,
        artist,
        venue,
        date: startTime,
        genre: raGenreToCanonical(raGenres),
        ticketSources: [{
          platform: 'venue-direct',
          url: ticketUrl,
          addedAt: new Date().toISOString(),
        }],
        sourceId: `ra-${event.id}`,
        sourcePlatform: 'venue-direct',
      });

      if (!normalized.success) {
        log.warning(`RA: normalization failed for "${name}":`, (normalized as any).errors);
        failed++;
        continue;
      }

      try {
        await deduplicateAndSave(normalized.data as any);
        success++;
      } catch (err) {
        log.error(`RA: save failed for "${name}":`, {
          error: err instanceof Error ? err.message : String(err),
        });
        failed++;
      }
    }

    fetched += items.length;
    log.info(`RA: page ${page} — ${fetched}/${totalResults} processed (${success} saved)`);
    page++;

    await new Promise(r => setTimeout(r, 300));
  }

  log.info(`RA crawl complete: ${success} success, ${failed} failed`);
  return { success, failed };
}
