/**
 * Gamla Enskede Bryggeri venue crawler
 *
 * Crawls: https://gamlaenskedebryggeri.se/pa-gang/
 * Events are inline text (not <li>): "19/2 EventName" separated by line breaks.
 */

import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as cheerio from 'cheerio';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const VENUE_URL = 'https://gamlaenskedebryggeri.se/pa-gang/';
const VENUE_NAME = 'Gamla Enskede Bryggeri';

function parseDate(day, month, year) {
  const now = new Date();
  const resolvedYear = year || now.getFullYear();
  const d = new Date(resolvedYear, month - 1, day, 20, 0, 0, 0);
  if (!year && d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    return new Date(resolvedYear + 1, month - 1, day, 20, 0, 0, 0);
  }
  return d;
}

export async function crawl() {
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    console.log(`🎸 Crawling ${VENUE_NAME}...`);
    console.log('📄 Fetching page...');
    const response = await fetch(VENUE_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    const html = await response.text();
    const $ = cheerio.load(html);

    // Events are inline text — convert <br> and </p> to newlines, strip tags, split
    const contentHtml = $('.entry-content, .wp-block-group, main, article').first().html()
      || $('body').html();

    const lines = contentHtml
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')   // strip remaining tags (keep text)
      .split('\n')
      .map(l => l.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    console.log(`🔍 Scanning ${lines.length} text lines for events...`);

    // Also collect href links keyed by surrounding text for FB event URLs
    const links = {};
    $('a[href]').each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr('href');
      if (text && href) links[text] = href;
    });

    let success = 0;
    let failed = 0;

    for (const line of lines) {
      try {
        // Match date at start: "19/2", "19/2/2026", "5/3"
        const match = line.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\s+(.+)/);
        if (!match) continue;

        const day = parseInt(match[1]);
        const month = parseInt(match[2]);
        const year = match[3] ? parseInt(match[3]) : null;
        const title = match[4].trim().replace(/\s+/g, ' ');

        if (!title || title.length < 2) continue;

        const eventDate = parseDate(day, month, year);
        if (!eventDate || isNaN(eventDate.getTime())) continue;

        // Try to find a Facebook/event link for this event
        const eventUrl = links[title] || VENUE_URL;

        const event = {
          name: title,
          artist: title,
          venue: VENUE_NAME,
          date: eventDate,
          time: '20:00',
          genre: 'other',
          ticketSources: [{
            platform: 'venue-direct',
            url: eventUrl,
            addedAt: new Date().toISOString(),
          }],
          sourceId: `geb-${title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 60)}-${eventDate.toISOString().split('T')[0]}`,
          sourcePlatform: 'venue-direct',
        };

        await db.insert(schema.events).values(event).onConflictDoUpdate({
          target: [schema.events.venue, schema.events.date],
          set: event,
        });

        success++;
        console.log(`✅ ${title} (${eventDate.toISOString().split('T')[0]})`);
      } catch (error) {
        failed++;
        console.error(`❌ Error: ${error.message}`);
      }
    }

    console.log(`\n✅ Complete: ${success} saved, ${failed} failed`);
    return { success, failed };
  } catch (error) {
    console.error('❌ Crawler failed:', error);
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
