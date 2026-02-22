/**
 * Gamla Enskede Bryggeri venue crawler
 *
 * Crawls: https://gamlaenskedebryggeri.se/pa-gang/
 * Simple static HTML list: <li>DD/MM EventName</li>
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

console.log(`🎸 Crawling ${VENUE_NAME}...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

/**
 * Parse "DD/MM" or "DD/MM/YYYY" date strings.
 * Assumes current year if year is missing.
 */
function parseDate(day, month, year) {
  const now = new Date();
  const resolvedYear = year || now.getFullYear();
  const d = new Date(resolvedYear, month - 1, day, 20, 0, 0, 0);
  // If no year given and date is in the past, try next year
  if (!year && d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    return new Date(resolvedYear + 1, month - 1, day, 20, 0, 0, 0);
  }
  return d;
}

try {
  console.log('📄 Fetching page...');
  const response = await fetch(VENUE_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('🔍 Parsing events...');

  let success = 0;
  let failed = 0;

  // Events are <li> elements starting with "DD/MM" or "DD/MM/YYYY"
  const listItems = $('li').toArray();
  console.log(`Scanning ${listItems.length} list items for events...`);

  for (const el of listItems) {
    try {
      const $el = $(el);
      const text = $el.text().trim();

      // Match date at start of line: "19/2", "19/2/2026", "5/3"
      const match = text.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\s+(.+)$/);
      if (!match) continue;

      const day = parseInt(match[1]);
      const month = parseInt(match[2]);
      const year = match[3] ? parseInt(match[3]) : null;
      const title = match[4].trim();

      if (!title || title.length < 2) continue;

      const eventDate = parseDate(day, month, year);
      if (!eventDate || isNaN(eventDate.getTime())) {
        console.log(`  ⚠️  Could not parse date for: ${text}`);
        continue;
      }

      // Use Facebook event link if present, otherwise venue page
      const linkEl = $el.find('a').first();
      const eventUrl = linkEl.attr('href') || VENUE_URL;

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

  await client.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Crawler failed:', error);
  await client.end();
  process.exit(1);
}
