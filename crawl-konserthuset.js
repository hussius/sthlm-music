/**
 * Konserthuset Stockholm venue crawler
 *
 * Crawls: https://www.konserthuset.se/program-och-biljetter/kalender/
 * Static HTML with schema.org MusicEvent markup.
 * Events: <li data-fulltime="YYYY-MM-DD HH:MM:SS" itemscope itemtype="https://schema.org/MusicEvent">
 * Title: <h3 class="calendar-listing-results-header">
 * URL: <span itemprop="url" content="https://...">
 *
 * Note: Page shows ~10 days of events from today. Run regularly to capture upcoming events.
 */

import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as cheerio from 'cheerio';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const CALENDAR_URL = 'https://www.konserthuset.se/program-och-biljetter/kalender/';
const VENUE_NAME = 'Konserthuset';

console.log(`🎸 Crawling ${VENUE_NAME}...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

try {
  console.log('📄 Fetching calendar page...');
  const response = await fetch(CALENDAR_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('🔍 Parsing events...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events = [];
  const seen = new Set();

  // Events: <li data-fulltime="YYYY-MM-DD HH:MM:SS" itemscope itemtype="https://schema.org/MusicEvent">
  $('li[data-fulltime]').each((_, el) => {
    const $li = $(el);
    const fulltime = $li.attr('data-fulltime'); // "2026-02-22 16:00:00"
    if (!fulltime) return;

    // Parse date from data-fulltime: "2026-02-22 16:00:00"
    const [datePart, timePart] = fulltime.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = (timePart || '20:00:00').split(':').map(Number);
    const eventDate = new Date(year, month - 1, day, hour, minute, 0, 0);

    if (isNaN(eventDate.getTime())) return;
    if (eventDate < today) return;

    // Title from <h3 class="calendar-listing-results-header">
    const title = $li.find('h3.calendar-listing-results-header').text().trim();
    if (!title) return;

    // URL from <span itemprop="url" content="https://...">
    const eventUrl = $li.find('[itemprop="url"][content]').first().attr('content') || CALENDAR_URL;

    if (seen.has(eventUrl)) return;
    seen.add(eventUrl);

    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
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
        sourceId: `konserthuset-${title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 60)}-${eventDate.toISOString().split('T')[0]}`,
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
