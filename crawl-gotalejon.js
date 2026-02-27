/**
 * Göta Lejon venue crawler
 *
 * Crawls: https://www.gotalejon.se/api/search/events
 * Live Nation JSON API with community=95. Fetches all Stockholm events
 * and filters by venue name containing "Göta" or "Lejon".
 *
 * Note: API returns ~200+ Stockholm events across ~11 pages (20 per page).
 * Filters by venue.name to isolate only Göta Lejon events.
 */

import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const API_BASE = 'https://www.gotalejon.se/api/search/events';
const VENUE_NAME = 'Göta Lejon';
const PAGE_SIZE = 20;
const MAX_PAGES = 15;

function isGotaLejonVenue(venueName) {
  if (!venueName) return false;
  const lower = venueName.toLowerCase();
  return lower.includes('göt') || lower.includes('gota') || lower.includes('lejon');
}

function buildUrl(page) {
  const params = new URLSearchParams({
    community: '95',
    size: String(PAGE_SIZE),
    page: String(page),
    location: 'Stockholm',
  });
  return `${API_BASE}?${params.toString()}`;
}

export async function crawl() {
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    console.log(`Crawling ${VENUE_NAME}...`);
    console.log('Fetching events from Live Nation API...');

    // Fetch page 0 first to determine total count
    const firstResponse = await fetch(buildUrl(0), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; StockholmEventsBot/1.0)',
      },
    });
    if (!firstResponse.ok) throw new Error(`HTTP ${firstResponse.status}: ${firstResponse.statusText}`);

    const firstData = await firstResponse.json();
    const total = firstData.total || 0;
    const totalPages = Math.min(Math.ceil(total / PAGE_SIZE), MAX_PAGES);

    console.log(`Total Stockholm events: ${total}, fetching ${totalPages} pages...`);

    // Collect all documents across pages
    let allDocuments = [...(firstData.documents || [])];

    for (let page = 1; page < totalPages; page++) {
      const response = await fetch(buildUrl(page), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; StockholmEventsBot/1.0)',
        },
      });
      if (!response.ok) {
        console.warn(`  Warning: Page ${page} returned HTTP ${response.status}, skipping`);
        continue;
      }
      const data = await response.json();
      const docs = data.documents || [];
      if (docs.length === 0) break;
      allDocuments = allDocuments.concat(docs);
    }

    console.log(`Fetched ${allDocuments.length} total Stockholm events`);

    // Filter to Göta Lejon events only
    const gotaLejonDocs = allDocuments.filter(doc =>
      isGotaLejonVenue(doc?.venue?.name)
    );

    console.log(`Found ${gotaLejonDocs.length} Göta Lejon events`);

    if (gotaLejonDocs.length === 0) {
      console.warn('No Göta Lejon events found — API filter may need adjustment');
      return { success: 0, failed: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let success = 0;
    let failed = 0;
    let skipped = 0;

    for (const doc of gotaLejonDocs) {
      try {
        const name = doc.name?.trim();
        if (!name) continue;

        const eventDate = new Date(doc.eventDate);
        if (isNaN(eventDate.getTime())) {
          console.log(`  Warning: Could not parse date for: ${name}`);
          continue;
        }

        if (eventDate < today) {
          skipped++;
          continue;
        }

        const dateStr = eventDate.toISOString().split('T')[0];
        const timeStr = `${String(eventDate.getUTCHours()).padStart(2, '0')}:${String(eventDate.getUTCMinutes()).padStart(2, '0')}`;

        // Primary artist from lineup
        const primaryLineup = doc.lineup?.find(l => l.isPrimary);
        const artist = primaryLineup?.name || name;

        // Ticket URL
        const ticketUrl = doc.tickets?.[0]?.ticketUrl || 'https://www.gotalejon.se/kalendarium';

        // Swedish event page URL from localizations
        const sweLocalization = doc.localizations?.find(l =>
          l.url && l.url.includes('gotalejon.se')
        );
        const eventUrl = sweLocalization?.url || ticketUrl;

        const sourceId = `gotalejon-${name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 60)}-${dateStr}`;

        const event = {
          name,
          artist,
          venue: VENUE_NAME,
          date: eventDate,
          time: timeStr,
          genre: 'other',
          ticketSources: [{
            platform: 'venue-direct',
            url: ticketUrl,
            addedAt: new Date().toISOString(),
          }],
          sourceId,
          sourcePlatform: 'venue-direct',
        };

        await db.insert(schema.events).values(event).onConflictDoUpdate({
          target: [schema.events.venue, schema.events.date],
          set: event,
        });

        success++;
        console.log(`Saved: ${name} (${dateStr} ${timeStr})`);
      } catch (error) {
        failed++;
        console.error(`Error processing event: ${error.message}`);
      }
    }

    console.log(`\nComplete: ${success} saved, ${failed} failed, ${skipped} past events skipped`);
    return { success, failed };
  } catch (error) {
    console.error('Crawler failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Standalone runner
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  crawl().then(r => { console.log(r); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });
}
