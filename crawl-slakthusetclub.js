/**
 * Slakthusetclub venue crawler
 *
 * Crawls: https://slakthusetclub.se/?post_type=tribe_events&ical=1&eventDisplay=list
 * The Events Calendar plugin exposes an iCal feed. Parse VEVENT blocks manually.
 * DTSTART format: 20260227T220000 (with TZID=Europe/Stockholm)
 *
 * Note: Separate from the Slakthusen (Hus 7) crawler — this is the club nights venue.
 */

import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const ICAL_URL = 'https://slakthusetclub.se/?post_type=tribe_events&ical=1&eventDisplay=list';
const VENUE_NAME = 'Slakthusetclub';

console.log(`🎸 Crawling ${VENUE_NAME}...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

function parseDtstart(dtstart) {
  // Format: 20260227T220000 or 20260227T220000Z
  const match = dtstart.trim().match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

try {
  console.log('📄 Fetching iCal feed...');
  const response = await fetch(ICAL_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

  const ical = await response.text();

  console.log('🔍 Parsing events...');

  // Split into VEVENT blocks
  const vevents = ical.split('BEGIN:VEVENT').slice(1);
  console.log(`Found ${vevents.length} VEVENT blocks`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let success = 0;
  let failed = 0;
  const seen = new Set();

  for (const block of vevents) {
    try {
      // Unfold multi-line values (iCal lines continued with a leading space/tab)
      const unfolded = block.replace(/\r?\n[ \t]/g, '');

      // Get the value after the first colon (handles PROP:value and PROP;params:value)
      const getField = (name) => {
        const match = unfolded.match(new RegExp(`^${name}(?:;[^:]*)?:([^\r\n]*)`, 'm'));
        return match ? match[1].trim() : '';
      };

      const summary = getField('SUMMARY').replace(/\\,/g, ',').replace(/\\n/g, ' ').trim();
      if (!summary) continue;

      const dtstartRaw = unfolded.match(/^DTSTART[^\r\n]*/m)?.[0] || '';
      // Extract the value after the last colon (handles DTSTART;TZID=...:value)
      const dtstartValue = dtstartRaw.split(':').pop() || '';
      const eventDate = parseDtstart(dtstartValue);

      if (!eventDate || isNaN(eventDate.getTime())) {
        console.log(`  ⚠️  No date for: ${summary}`);
        continue;
      }

      // Skip past events
      if (eventDate < today) continue;

      const eventUrl = getField('URL') || ICAL_URL;
      const uid = getField('UID') || summary;

      if (seen.has(uid)) continue;
      seen.add(uid);

      const timeStr = `${String(eventDate.getHours()).padStart(2, '0')}:${String(eventDate.getMinutes()).padStart(2, '0')}`;

      const event = {
        name: summary,
        artist: summary,
        venue: VENUE_NAME,
        date: eventDate,
        time: timeStr,
        genre: 'other',
        ticketSources: [{
          platform: 'venue-direct',
          url: eventUrl,
          addedAt: new Date().toISOString(),
        }],
        sourceId: `slakthusetclub-${summary.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 60)}-${eventDate.toISOString().split('T')[0]}`,
        sourcePlatform: 'venue-direct',
      };

      await db.insert(schema.events).values(event).onConflictDoUpdate({
        target: [schema.events.venue, schema.events.date],
        set: event,
      });

      success++;
      console.log(`✅ ${summary} (${eventDate.toISOString().split('T')[0]} ${timeStr})`);
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
