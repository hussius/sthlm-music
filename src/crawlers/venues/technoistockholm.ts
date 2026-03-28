/**
 * Techno i Stockholm event crawler.
 *
 * Techno i Stockholm (technoistockholm.se) is a community-curated listing
 * of electronic, industrial, and underground music events in Stockholm.
 * It covers many venues and organizers not tracked elsewhere.
 *
 * Strategy:
 * 1. Fetch the homepage HTML
 * 2. Decode all Next.js __next_f.push() script payloads into a single text blob
 * 3. Extract structured JSON event objects embedded in the RSC payload —
 *    each has startDate (ISO), title ("Artist | Venue"), tags ([{name}]), tickets ([{url,price}])
 * 4. Normalize and save via deduplicateAndSave
 *
 * Why direct JSON extraction (not LLM):
 * - The page embeds structured event data in its RSC payload
 * - Extracting JSON is faster, cheaper, and requires no external API
 * - Genre data comes directly from the site's tag taxonomy
 *
 * Site: https://technoistockholm.se
 */

import { log } from 'crawlee';
import { normalizeEventData } from '../../normalization/schemas.js';
import { deduplicateAndSave } from '../../deduplication/deduplicator.js';
import type { CANONICAL_GENRES } from '../../normalization/genre-mappings.js';

const BASE_URL = 'https://technoistockholm.se';
const SOURCE_PLATFORM = 'venue-direct' as const;

// Regex to extract JSON event blobs from the RSC payload.
// Each event has: startDate, slug, title, tags, type, id, tickets
const EVENT_BLOB_RE =
  /\{"startDate":"(\d{4}-\d{2}-\d{2}T[^"]+)","createdAt":"[^"]+","slug":"([^"]+)","title":"([^"]+)","secretLocation":[^,]+,"tags":(\[[^\]]*\]),"type":"([^"]+)","id":"([^"]+)","description":"[^"]*","url":[^,]*,"tickets":(\[[^\]]*\])/g;

interface ExtractedEvent {
  startDate: string;
  slug: string;
  title: string;
  artist: string;
  venue: string;
  tags: string[];
  ticketUrl: string;
  price?: string;
}

/**
 * Parse artist and venue out of a title like "Artist | Venue" or
 * "Artist | Stockholm, Venue Name" or just "Event Name".
 */
function parseTitleToArtistVenue(title: string): { artist: string; venue: string } {
  const parts = title.split(' | ');

  if (parts.length === 1) {
    return { artist: title.trim(), venue: 'Stockholm' };
  }

  const artistPart = parts.slice(0, -1).join(' | ').trim();
  const venuePart = parts[parts.length - 1].trim();

  // "Stockholm, Kollektivet Livet" → "Kollektivet Livet"
  const commaIdx = venuePart.indexOf(', ');
  const venue = commaIdx !== -1 ? venuePart.slice(commaIdx + 2) : venuePart;

  return { artist: artistPart, venue: venue || 'Stockholm' };
}

/**
 * Map the site's tag names to a canonical genre.
 */
function resolveGenre(tags: string[]): typeof CANONICAL_GENRES[number] {
  const t = tags.join(' ').toLowerCase();
  if (/trance|psytrance|psy-trance|goa/.test(t)) return 'trance';
  if (/industrial|ebm|dark electro|darkwave|dark wave/.test(t)) return 'industrial';
  if (/techno|house|acid|electro|rave|club|dnb|drum|bass|dubstep|breakbeat|garage|jungle/.test(t)) return 'electronic';
  if (/ambient/.test(t)) return 'electronic';
  if (/metal|grind|sludge|doom/.test(t)) return 'metal';
  if (/punk|kraut|post.rock|postrock|shoegaze|new.wave|wave/.test(t)) return 'rock';
  if (/rock/.test(t)) return 'rock';
  if (/jazz/.test(t)) return 'jazz';
  if (/hip.?hop|rap|trap/.test(t)) return 'hip-hop';
  if (/pop/.test(t)) return 'pop';
  if (/folk|country/.test(t)) return 'folk';
  if (/classical|orchestra|chamber/.test(t)) return 'classical';
  return 'other';
}

/**
 * Fetch the page and extract structured event objects from the RSC payload.
 * Returns a deduplicated list (by event ID).
 */
async function extractEventsFromPage(): Promise<ExtractedEvent[]> {
  const res = await fetch(BASE_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; events-aggregator/1.0)' },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();

  // Decode all __next_f.push([1, "..."]) string payloads
  const chunks: string[] = [];
  const pushRe = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
  let pm: RegExpExecArray | null;
  while ((pm = pushRe.exec(html)) !== null) {
    try {
      chunks.push(JSON.parse('"' + pm[1] + '"') as string);
    } catch {
      // skip malformed chunks
    }
  }
  const text = chunks.join('\n');

  // Extract and deduplicate event blobs
  const seen = new Set<string>();
  const events: ExtractedEvent[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(EVENT_BLOB_RE.source, 'g');

  while ((m = re.exec(text)) !== null) {
    const [, startDate, slug, title, tagsJson, , id, ticketsJson] = m;
    if (seen.has(id)) continue;
    seen.add(id);

    let tags: string[] = [];
    try { tags = (JSON.parse(tagsJson) as Array<{ name: string }>).map(t => t.name); } catch { /* ignore */ }

    let ticketUrl = BASE_URL;
    let price: string | undefined;
    try {
      const tickets = JSON.parse(ticketsJson) as Array<{ url?: string; price?: string }>;
      if (tickets[0]?.url) ticketUrl = tickets[0].url;
      if (tickets[0]?.price) price = `${tickets[0].price} SEK`;
    } catch { /* ignore */ }

    const { artist, venue } = parseTitleToArtistVenue(title);

    events.push({ startDate, slug, title, artist, venue, tags, ticketUrl, price });
  }

  return events;
}

export async function crawlTechnoiStockholm(): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  log.info('Techno i Stockholm: fetching page and extracting events...');

  let rawEvents: ExtractedEvent[];
  try {
    rawEvents = await extractEventsFromPage();
  } catch (err) {
    log.error('Techno i Stockholm: page extraction failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: 0, failed: 1 };
  }

  log.info(`Techno i Stockholm: extracted ${rawEvents.length} unique events`);

  for (const evt of rawEvents) {
    const genre = resolveGenre(evt.tags);
    const sourceId = `technoistockholm-${evt.slug || evt.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const normalized = normalizeEventData({
      name: evt.title,
      artist: evt.artist,
      venue: evt.venue,
      date: evt.startDate,
      genre,
      ticketSources: [{
        platform: SOURCE_PLATFORM,
        url: evt.ticketUrl,
        addedAt: new Date().toISOString(),
      }],
      sourceId,
      sourcePlatform: SOURCE_PLATFORM,
      price: evt.price,
    });

    if (!normalized.success) {
      log.warning(`Techno i Stockholm: normalization failed for "${evt.title}":`, (normalized as any).errors);
      failed++;
      continue;
    }

    try {
      await deduplicateAndSave(normalized.data as any);
      log.info(`Techno i Stockholm: saved "${evt.artist}" @ ${evt.venue} [${genre}]`);
      success++;
    } catch (err) {
      log.error(`Techno i Stockholm: save failed for "${evt.title}":`, {
        error: err instanceof Error ? err.message : String(err),
      });
      failed++;
    }
  }

  log.info(`Techno i Stockholm crawl complete: ${success} success, ${failed} failed`);
  return { success, failed };
}
