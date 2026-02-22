/**
 * Nalen venue crawler
 *
 * Crawls: https://nalen.com/sv/konserter-event
 * Storyblok + Next.js site — all events are in static HTML.
 * Structure: <a href="/sv/konsert/[slug]">
 *   <div class="rich-content"><p>[Artist]</p></div>     ← artist name
 *   <p class="font-headline font-md ...">[Support]</p>  ← support act (optional)
 *   <div class="justify-self-end"><p ...>[DD month]</p>  ← date (e.g. "02 mars")
 * Date format: "28 feb." or "02 mars" (Swedish abbreviated month, no year shown)
 */

import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as cheerio from 'cheerio';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const VENUE_URL = 'https://nalen.com/sv/konserter-event';
const BASE_URL = 'https://nalen.com';
const VENUE_NAME = 'Nalen';

console.log(`🎸 Crawling ${VENUE_NAME}...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

const MONTHS = {
  jan: 0, 'jan.': 0, januari: 0,
  feb: 1, 'feb.': 1, februari: 1,
  mars: 2, mar: 2,
  apr: 3, 'apr.': 3, april: 3,
  maj: 4,
  jun: 5, 'jun.': 5, juni: 5,
  jul: 6, 'jul.': 6, juli: 6,
  aug: 7, 'aug.': 7, augusti: 7,
  sep: 8, 'sep.': 8, september: 8,
  okt: 9, 'okt.': 9, oktober: 9,
  nov: 10, 'nov.': 10, november: 10,
  dec: 11, 'dec.': 11, december: 11,
};

function parseNalenDate(text) {
  // Format: "02 mars" or "28 feb." or "07 feb. - 23 maj" (recurring)
  // For recurring events, use the first date
  const match = text.trim().match(/^(\d{1,2})\s+(\w+\.?)/);
  if (!match) return null;

  const day = parseInt(match[1]);
  const monthKey = match[2].toLowerCase();
  const month = MONTHS[monthKey];
  if (month === undefined) return null;

  const now = new Date();
  const year = now.getFullYear();
  // Default show time to 20:00 (Nalen doesn't show time in listing)
  const d = new Date(year, month, day, 20, 0, 0, 0);
  // If date is in the past, assume next year
  if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    return new Date(year + 1, month, day, 20, 0, 0, 0);
  }
  return d;
}

try {
  console.log('📄 Fetching events page...');
  const response = await fetch(VENUE_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('🔍 Parsing events...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events = [];
  const seen = new Set();

  // Each event is an <a href="/sv/konsert/[slug]">
  $('a[href*="/sv/konsert/"]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href') || '';
    if (!href || seen.has(href)) return;

    // Artist name: inside .rich-content p (first one)
    const title = $a.find('.rich-content p').first().text().trim();
    if (!title) return;

    // Date: inside .justify-self-end p (the date display at bottom-right)
    const dateText = $a.find('.justify-self-end p').text().trim();
    if (!dateText) return;

    const eventDate = parseNalenDate(dateText);
    if (!eventDate || eventDate < today) return;

    seen.add(href);

    const eventUrl = `${BASE_URL}${href}`;
    const timeStr = '20:00';

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
        sourceId: `nalen-${title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 60)}-${eventDate.toISOString().split('T')[0]}`,
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
