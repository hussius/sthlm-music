/**
 * Geronimos FGT venue crawler
 *
 * Crawls: https://www.geronimosfgt.se/events/feed/
 * WordPress MEC RSS feed with mec:startDate and mec:startHour elements.
 * Same pattern as crawl-rosettas.js.
 */

import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as cheerio from 'cheerio';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const FEED_URL = 'https://www.geronimosfgt.se/events/feed/';
const VENUE_NAME = 'Geronimos FGT';

console.log(`🎸 Crawling ${VENUE_NAME}...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

try {
  console.log('📄 Fetching RSS feed...');
  const response = await fetch(FEED_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

  const xml = await response.text();
  const $ = cheerio.load(xml, { xmlMode: true });

  console.log('🔍 Parsing events...');

  const items = $('item').toArray();
  console.log(`Found ${items.length} items in feed`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let success = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const $item = $(item);

      const title = $item.find('title').first().text().trim();
      if (!title) continue;

      const eventUrl = $item.find('link').first().text().trim()
        || $item.find('guid').first().text().trim();

      // MEC structured date/time fields
      const startDateStr = $item.find('mec\\:startDate, startDate').first().text().trim();
      const startHourStr = $item.find('mec\\:startHour, startHour').first().text().trim();
      const pubDateStr = $item.find('pubDate').first().text().trim();

      let eventDate;
      if (startDateStr) {
        const [year, month, day] = startDateStr.split('-').map(Number);
        const [hour, minute] = (startHourStr || '20:00').split(':').map(Number);
        eventDate = new Date(year, month - 1, day, hour, minute || 0, 0, 0);
      } else if (pubDateStr) {
        eventDate = new Date(pubDateStr);
        if (!isNaN(eventDate.getTime())) eventDate.setSeconds(0, 0);
      }

      if (!eventDate || isNaN(eventDate.getTime())) {
        console.log(`  ⚠️  No date for: ${title}`);
        continue;
      }

      // Skip past events
      if (eventDate < today) continue;

      const timeStr = `${String(eventDate.getHours()).padStart(2, '0')}:${String(eventDate.getMinutes()).padStart(2, '0')}`;

      const event = {
        name: title,
        artist: title,
        venue: VENUE_NAME,
        date: eventDate,
        time: timeStr,
        genre: 'other',
        ticketSources: [{
          platform: 'venue-direct',
          url: eventUrl || FEED_URL,
          addedAt: new Date().toISOString(),
        }],
        sourceId: `geronimosfgt-${title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 60)}-${eventDate.toISOString().split('T')[0]}`,
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
