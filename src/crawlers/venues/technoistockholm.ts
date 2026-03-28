/**
 * Techno i Stockholm event crawler.
 *
 * Techno i Stockholm (technoistockholm.se) is a community-curated listing
 * of electronic, industrial, and underground music events in Stockholm.
 * It covers many venues and organizers not tracked elsewhere.
 *
 * Strategy:
 * 1. Fetch the homepage HTML
 * 2. Extract all text content from the page
 * 3. Use Claude Haiku to parse the unstructured Swedish event descriptions
 *    into structured JSON (name, venue, date, genre, ticket URL)
 * 4. Normalize and save via deduplicateAndSave
 *
 * Why LLM parsing:
 * - The site is Next.js SSR with no JSON-LD or structured data
 * - Event blocks use inconsistent Swedish text labels
 * - Claude handles varying date formats and inline genre tags reliably
 *
 * Site: https://technoistockholm.se
 */

import Anthropic from '@anthropic-ai/sdk';
import { log } from 'crawlee';
import { normalizeEventData } from '../../normalization/schemas.js';
import { deduplicateAndSave } from '../../deduplication/deduplicator.js';
import { CANONICAL_GENRES } from '../../normalization/genre-mappings.js';

const BASE_URL = 'https://technoistockholm.se';
const SOURCE_PLATFORM = 'venue-direct' as const;

const SWEDISH_MONTHS: Record<string, string> = {
  januari: '01', februari: '02', mars: '03', april: '04',
  maj: '05', juni: '06', juli: '07', augusti: '08',
  september: '09', oktober: '10', november: '11', december: '12',
};

/**
 * Convert a Swedish date string to ISO 8601 format.
 * Handles patterns like "8 april 2026", "april 11", "måndag 15 juni", etc.
 * Falls back to null if the date cannot be parsed.
 */
function parseSwedishDate(raw: string): string | null {
  const cleaned = raw.trim().toLowerCase();

  // Already ISO: "2026-04-08" or "2026-04-08T20:00:00"
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
    return cleaned.slice(0, 10);
  }

  const currentYear = new Date().getFullYear();

  // "8 april 2026" or "8 april"
  const dmy = cleaned.match(/(\d{1,2})\s+([a-zåäö]+)(?:\s+(\d{4}))?/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = SWEDISH_MONTHS[dmy[2]];
    const year = dmy[3] || String(currentYear);
    if (month) {
      const candidate = `${year}-${month}-${day}`;
      // If date is in the past, try next year
      if (new Date(candidate) < new Date() && !dmy[3]) {
        return `${currentYear + 1}-${month}-${day}`;
      }
      return candidate;
    }
  }

  // "april 8 2026" or "april 8"
  const mdy = cleaned.match(/([a-zåäö]+)\s+(\d{1,2})(?:\s+(\d{4}))?/);
  if (mdy) {
    const month = SWEDISH_MONTHS[mdy[1]];
    const day = mdy[2].padStart(2, '0');
    const year = mdy[3] || String(currentYear);
    if (month) {
      const candidate = `${year}-${month}-${day}`;
      if (new Date(candidate) < new Date() && !mdy[3]) {
        return `${currentYear + 1}-${month}-${day}`;
      }
      return candidate;
    }
  }

  return null;
}

interface RawEvent {
  name: string;
  venue: string;
  date: string;       // raw date string from the page
  time?: string;      // e.g. "20:00"
  genres: string[];   // raw genre strings from the page
  ticketUrl?: string;
  price?: string;
}

/**
 * Fetch the page HTML and use Claude Haiku to extract structured event data.
 */
async function extractEventsFromPage(client: Anthropic): Promise<RawEvent[]> {
  const res = await fetch(BASE_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; events-aggregator/1.0)',
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();

  // Strip HTML tags and collapse whitespace for a compact text payload
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    // Keep only the first 25 000 chars to stay within token limits
    .slice(0, 25_000);

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are an event data extractor. Extract ALL upcoming music events from this Stockholm event listing page.

Page text (Swedish):
${text}

Return a JSON array of events. Each event must have:
- "name": event/headliner name (required)
- "venue": venue name in Stockholm (required)
- "date": date string exactly as it appears on the page (required)
- "time": door time or start time if present (optional, e.g. "20:00")
- "genres": array of genre strings mentioned for this event (optional, e.g. ["techno", "acid", "EBM"])
- "ticketUrl": ticket purchase URL if found (optional)
- "price": price if mentioned (optional)

Rules:
- Only include events in Stockholm, Sweden
- Only include future events (it is currently ${new Date().toISOString().slice(0, 10)})
- Do not invent data — only include what is explicitly stated on the page
- If an event has no genres listed, use an empty array []
- Respond with a JSON array only — no explanation, no markdown fences`,
      },
    ],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]';
  const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e: any) => typeof e.name === 'string' && typeof e.venue === 'string' && typeof e.date === 'string',
    );
  } catch {
    log.error('Techno i Stockholm: failed to parse LLM response', { raw: raw.slice(0, 200) });
    return [];
  }
}

/**
 * Map raw genre strings from the site to canonical genres.
 * Uses the existing mapGenre function as a fallback.
 */
function resolveGenre(genres: string[]): typeof CANONICAL_GENRES[number] {
  const text = genres.join(' ').toLowerCase();

  if (/trance|psytrance|psy-trance|goa/.test(text)) return 'trance';
  if (/industrial|ebm|dark electro|darkwave|noise/.test(text)) return 'industrial';
  if (/techno|house|acid|electro|rave|club|dnb|drum|bass|dubstep|breakbeat/.test(text)) return 'electronic';
  if (/ambient|experimental electronic/.test(text)) return 'electronic';
  if (/metal|grind|sludge|doom/.test(text)) return 'metal';
  if (/punk|kraut|post-rock|postrock|shoegaze|new wave/.test(text)) return 'rock';
  if (/rock/.test(text)) return 'rock';
  if (/jazz/.test(text)) return 'jazz';
  if (/hip.?hop|rap|trap/.test(text)) return 'hip-hop';
  if (/pop/.test(text)) return 'pop';
  if (/folk|country/.test(text)) return 'folk';
  if (/classical|orchestra|chamber/.test(text)) return 'classical';

  return 'other';
}

export async function crawlTechnoiStockholm(): Promise<{ success: number; failed: number }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    log.warning('Techno i Stockholm: ANTHROPIC_API_KEY not set — skipping');
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  const client = new Anthropic();

  log.info('Techno i Stockholm: fetching page and extracting events with LLM...');

  let rawEvents: RawEvent[];
  try {
    rawEvents = await extractEventsFromPage(client);
  } catch (err) {
    log.error('Techno i Stockholm: page extraction failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: 0, failed: 1 };
  }

  log.info(`Techno i Stockholm: LLM extracted ${rawEvents.length} events`);

  for (const raw of rawEvents) {
    const isoDate = parseSwedishDate(raw.date);
    if (!isoDate) {
      log.warning(`Techno i Stockholm: could not parse date "${raw.date}" for "${raw.name}"`);
      failed++;
      continue;
    }

    // Combine date and time if present
    const dateTime = raw.time ? `${isoDate}T${raw.time}:00` : `${isoDate}T20:00:00`;

    const genre = resolveGenre(raw.genres ?? []);

    const ticketUrl = raw.ticketUrl || BASE_URL;

    // Stable source ID based on name + date
    const sourceId = `technoistockholm-${raw.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${isoDate}`;

    const normalized = normalizeEventData({
      name: raw.name,
      artist: raw.name,
      venue: raw.venue,
      date: dateTime,
      genre,
      ticketSources: [{
        platform: SOURCE_PLATFORM,
        url: ticketUrl,
        addedAt: new Date().toISOString(),
      }],
      sourceId,
      sourcePlatform: SOURCE_PLATFORM,
      price: raw.price,
    });

    if (!normalized.success) {
      log.warning(`Techno i Stockholm: normalization failed for "${raw.name}":`, (normalized as any).errors);
      failed++;
      continue;
    }

    try {
      await deduplicateAndSave(normalized.data as any);
      success++;
    } catch (err) {
      log.error(`Techno i Stockholm: save failed for "${raw.name}":`, {
        error: err instanceof Error ? err.message : String(err),
      });
      failed++;
    }
  }

  log.info(`Techno i Stockholm crawl complete: ${success} success, ${failed} failed`);
  return { success, failed };
}
