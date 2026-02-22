/**
 * Reimersholme Hotel venue crawler
 *
 * Crawls: https://reimersholmehotel.se/evenemang/
 * Structure: <div> <img> <h3><a href="/event/...">Title</a></h3> <p>ons 25 feb Kl. 18:30</p> <a>Läs mer</a> </div>
 * Date format: "ons 25 februari Kl. 18:30"
 */

import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as cheerio from 'cheerio';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const VENUE_URL = 'https://reimersholmehotel.se/evenemang/';
const VENUE_NAME = 'Reimersholme';

console.log(`🎸 Crawling ${VENUE_NAME}...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

const MONTHS = {
  januari: 0, februari: 1, mars: 2, april: 3, maj: 4, juni: 5,
  juli: 6, augusti: 7, september: 8, oktober: 9, november: 10, december: 11,
};

function parseSwedishDate(text) {
  const match = text.match(/(\d{1,2})\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)(?:.*?Kl\.?\s*(\d{1,2}):(\d{2}))?/i);
  if (!match) return null;

  const day = parseInt(match[1]);
  const month = MONTHS[match[2].toLowerCase()];
  const hour = match[3] ? parseInt(match[3]) : 20;
  const minute = match[4] ? parseInt(match[4]) : 0;

  if (month === undefined) return null;

  const now = new Date();
  const year = now.getFullYear();
  const d = new Date(year, month, day, hour, minute, 0, 0);
  if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    return new Date(year + 1, month, day, hour, minute, 0, 0);
  }
  return d;
}

try {
  console.log('📄 Fetching page...');
  const response = await fetch(VENUE_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('🔍 Parsing events...');

  // Structure: <h3><a href="/event/...">Title</a></h3> <p>date</p>
  // Select only <a> tags whose direct parent is <h3> (skip "Läs mer" links)
  const events = [];
  const seen = new Set();

  $('a[href*="/event/"]').each((_, el) => {
    const $a = $(el);
    const $h3 = $a.parent('h3');
    if (!$h3.length) return; // skip "Läs mer" links (not inside <h3>)

    const title = $a.text().trim();
    if (!title) return;

    const eventUrl = $a.attr('href');
    if (seen.has(eventUrl)) return;
    seen.add(eventUrl);

    // Date <p> is the next sibling after <h3>
    const cardText = $h3.next('p').text().trim() || $h3.siblings('p').first().text().trim();
    const eventDate = parseSwedishDate(cardText);
    if (!eventDate) {
      console.log(`  ⚠️  No date for: ${title} (text: "${cardText}")`);
      return;
    }

    const timeStr = `${String(eventDate.getHours()).padStart(2, '0')}:${String(eventDate.getMinutes()).padStart(2, '0')}`;
    events.push({ title, eventUrl, eventDate, timeStr });
  });

  console.log(`Found ${events.length} events`);

  let success = 0;
  let failed = 0;

  for (const { title, eventUrl, eventDate, timeStr } of events) {
    try {
      const event = {
        name: title,
        artist: title,
        venue: VENUE_NAME,
        date: eventDate,
        time: timeStr,
        genre: 'other',
        ticketSources: [{
          platform: 'venue-direct',
          url: eventUrl,
          addedAt: new Date().toISOString(),
        }],
        sourceId: `reimersholme-${title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 60)}-${eventDate.toISOString().split('T')[0]}`,
        sourcePlatform: 'venue-direct',
      };

      await db.insert(schema.events).values(event).onConflictDoUpdate({
        target: [schema.events.venue, schema.events.date],
        set: event,
      });

      success++;
      console.log(`✅ ${title} (${eventDate.toISOString().split('T')[0]} ${timeStr})`);
    } catch (error) {
      failed++;
      console.error(`❌ ${title}: ${error.message}`);
    }
  }

  console.log(`\n✅ Complete: ${success} saved, ${failed} failed`);
  await client.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Crawler failed:', error);
  await client.end();
  process.exit(1);
}
