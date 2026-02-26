/**
 * Pet Sounds venue crawler
 *
 * Crawls: https://petsounds.se/bar
 * Structure: "Kommande event" section with plain text lines:
 *   "26/2 ARTIST NAME Releasespelning 21:00"
 *   Date is DD/M (no year), artist name in <strong>, time at end.
 * Note: static HTML — no JavaScript rendering needed.
 */

import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as cheerio from 'cheerio';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const VENUE_URL = 'https://petsounds.se/bar';
const VENUE_NAME = 'Pet Sounds';

console.log(`🎸 Crawling ${VENUE_NAME}...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

function parsePetSoundsDate(dateStr, timeStr) {
  // Date format: "26/2" (day/month, no year)
  const dateMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
  const timeMatch = timeStr?.match(/(\d{2}):(\d{2})/) || [null, '20', '00'];

  if (!dateMatch) return null;

  const day = parseInt(dateMatch[1]);
  const month = parseInt(dateMatch[2]) - 1; // 0-indexed
  const hour = parseInt(timeMatch[1]);
  const minute = parseInt(timeMatch[2]);

  // If month already passed this year, assume next year
  const now = new Date();
  let year = now.getFullYear();
  if (month < now.getMonth() || (month === now.getMonth() && day < now.getDate())) {
    year += 1;
  }

  return new Date(year, month, day, hour, minute, 0, 0);
}

try {
  console.log('📄 Fetching page...');
  const response = await fetch(VENUE_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('🔍 Parsing events...');

  // Events are in <p> tags with format: "26/2 ARTIST NAME Releasespelning 21:00"
  // Find all <p> elements matching that pattern anywhere on the page.
  const eventRegex = /^(\d{1,2}\/\d{1,2})\s+(.+?)\s+(\d{2}:\d{2})\s*$/;

  let success = 0;
  let failed = 0;

  const paragraphs = $('p').toArray();
  console.log(`Scanning ${paragraphs.length} paragraphs for events...`);

  for (const el of paragraphs) {
    const trimmed = $(el).text().trim();
    const match = trimmed.match(eventRegex);
    if (!match) continue;

    const [, dateStr, rawName, timeStr] = match;

    // Strip event type suffix like "Releasespelning" at the end of the name
    // Keep only the artist portion (before any Swedish event-type words)
    const name = rawName.replace(/\s+(Releasespelning|Spelning|Konsert|Release|Live)\s*$/i, '').trim();

    try {
      const eventDate = parsePetSoundsDate(dateStr, timeStr);
      if (!eventDate || isNaN(eventDate.getTime())) {
        console.log(`  ⚠️  Could not parse date "${dateStr} ${timeStr}" for: ${name}`);
        failed++;
        continue;
      }

      const event = {
        name,
        artist: name,
        venue: VENUE_NAME,
        date: eventDate,
        time: timeStr,
        genre: 'other',
        ticketSources: [{
          platform: 'venue-direct',
          url: VENUE_URL,
          addedAt: new Date().toISOString(),
        }],
        sourceId: `petsounds-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${eventDate.toISOString().split('T')[0]}`,
        sourcePlatform: 'venue-direct',
      };

      await db.insert(schema.events).values(event).onConflictDoUpdate({
        target: [schema.events.venue, schema.events.date],
        set: event,
      });

      success++;
      console.log(`✅ ${name} (${eventDate.toISOString().split('T')[0]} ${timeStr})`);
    } catch (error) {
      failed++;
      console.error(`❌ ${name}: ${error.message}`);
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
