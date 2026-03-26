/**
 * Tickster API crawler for Stockholm music events.
 *
 * Uses the Tickster Event API (event.api.tickster.com) to fetch all events
 * in Stockholm, paginating through results 100 at a time.
 *
 * Auth: x-api-key header (TICKSTER_API_KEY env var)
 * Endpoint: GET /api/v1.0/sv/events?query=city:Stockholm htype:event
 */

import { log } from 'crawlee';
import { normalizeEventData } from '../../normalization/schemas.js';
import { deduplicateAndSave } from '../../deduplication/deduplicator.js';

const API_BASE = 'https://event.api.tickster.com/api/v1.0/sv';
const PAGE_SIZE = 100;

function inferGenre(tags: string[], name: string): string {
  const text = [...tags, name].join(' ').toLowerCase();
  if (/jazz/.test(text)) return 'jazz';
  if (/klassisk|classical|orkester|symphony|konsert/.test(text)) return 'classical';
  if (/hip.?hop|rap/.test(text)) return 'hip-hop';
  if (/electronic|techno|house|club|dnb|drum.?bass/.test(text)) return 'electronic';
  if (/folk|country|visa/.test(text)) return 'folk';
  if (/metal|punk|hardcore/.test(text)) return 'metal';
  if (/rock/.test(text)) return 'rock';
  return 'pop';
}

export async function crawlTickster(): Promise<{ success: number; failed: number }> {
  const apiKey = process.env.TICKSTER_API_KEY;
  if (!apiKey) {
    log.error('Tickster: TICKSTER_API_KEY not set, skipping');
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;
  let skip = 0;
  let totalItems = Infinity;

  while (skip < totalItems) {
    const url = `${API_BASE}/events?query=${encodeURIComponent('city:Stockholm htype:event')}&take=${PAGE_SIZE}&skip=${skip}`;

    const res = await fetch(url, { headers: { 'x-api-key': apiKey } });

    if (res.status === 429) {
      log.warning('Tickster: rate limited, waiting 5s');
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

    if (!res.ok) {
      log.error(`Tickster: API error ${res.status}`);
      break;
    }

    const data = await (res.json() as Promise<any>);
    totalItems = data.totalItems ?? 0;
    const items: any[] = data.items ?? [];

    if (items.length === 0) break;

    for (const event of items) {
      const name: string = (event.name || '').trim();
      const artist: string = event.performers?.[0] || name;
      const venue: string = (event.venue?.name || '').trim();
      const date: string = event.startUtc || '';
      const shopUrl: string = event.shopUrl || event.infoUrl || '';
      const tags: string[] = event.tags ?? [];
      const organizer: string | undefined = event.organizer?.name || undefined;

      if (!name || !date || !venue || !shopUrl) {
        failed++;
        continue;
      }

      // Skip non-Stockholm venues (API city filter is approximate)
      const venueCity = (event.venue?.city || '').toLowerCase();
      if (venueCity && !venueCity.includes('stockholm')) continue;

      const normalized = normalizeEventData({
        name,
        artist,
        venue,
        date,
        genre: inferGenre(tags, name),
        ticketSources: [{
          platform: 'tickster',
          url: shopUrl,
          addedAt: new Date().toISOString(),
        }],
        sourceId: `tickster-${event.id}`,
        sourcePlatform: 'tickster',
        organizer,
      });

      if (!normalized.success) {
        log.warning(`Tickster: normalization failed for "${name}":`, (normalized as any).errors);
        failed++;
        continue;
      }

      try {
        await deduplicateAndSave(normalized.data as any);
        success++;
      } catch (err) {
        log.error(`Tickster: save failed for "${name}":`, {
          error: err instanceof Error ? err.message : String(err),
        });
        failed++;
      }
    }

    skip += items.length;
    log.info(`Tickster: ${skip}/${totalItems} processed (${success} saved so far)`);

    // Polite delay between pages
    await new Promise(r => setTimeout(r, 200));
  }

  log.info(`Tickster crawl complete: ${success} success, ${failed} failed`);
  return { success, failed };
}
