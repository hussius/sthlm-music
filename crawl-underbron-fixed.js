/**
 * Under Bron venue crawler (fixed replacement for crawl-underbron.js)
 *
 * Crawls: https://www.underbron.com/?view=program
 * Under Bron is a club/nightlife venue with a custom site.
 * Structure: div.programpost
 *   div.datumdatum   ← date "27/2", "6/3"
 *   img.thumbthumb   ← image with src containing event hint (no useful alt)
 *   span.litenrubbe  ← formatted date "27 FEB" (not event name)
 *   span.texttext    ← price/entry info text
 *
 * Most events are generic club nights without named artists.
 * Name strategy:
 *   1. Try img src filename (strip date patterns, clean up)
 *   2. Fall back to "Under Bron Club Night"
 *
 * 0 events is non-fatal (club listing may vary).
 */

import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as cheerio from 'cheerio';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const VENUE_URL = 'https://www.underbron.com/?view=program';
const VENUE_NAME = 'Under Bron';

console.log(`Crawling ${VENUE_NAME}...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

/**
 * Parse dates in Under Bron's DD/M format (e.g. "27/2", "6/3", "2/4").
 * Copied from original crawl-underbron.js, handles day/month and DD MMM formats.
 */
function parseUnderBronDate(dateStr) {
  const currentYear = new Date().getFullYear();

  // Try format: "27/2" or "6/3"
  let match = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed

    const now = new Date();
    let year = currentYear;
    if (month < now.getMonth() || (month === now.getMonth() && day < now.getDate())) {
      year += 1;
    }

    return new Date(year, month, day, 22, 0, 0, 0);
  }

  // Try format: "28 FEB" or "6 MAR" (from litenrubbe, used as fallback)
  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3, maj: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, dec: 11,
    januari: 0, februari: 1, mars: 2, april: 3, juni: 5,
    juli: 6, augusti: 7, september: 8, oktober: 9, november: 10, december: 11,
  };

  match = dateStr.match(/(\d{1,2})\s+(\w+)/i);
  if (match) {
    const day = parseInt(match[1], 10);
    const monthName = match[2].toLowerCase();
    const month = months[monthName];

    if (month !== undefined) {
      const now = new Date();
      let year = currentYear;
      if (month < now.getMonth() || (month === now.getMonth() && day < now.getDate())) {
        year += 1;
      }
      return new Date(year, month, day, 22, 0, 0, 0);
    }
  }

  return null;
}

/**
 * Extract a human-readable event name from an image filename.
 * E.g. "1770974414_s-club-stockholm-final.jpg" → "S Club Stockholm"
 * Returns null if the filename doesn't contain meaningful content.
 */
function nameFromImageSrc(src) {
  if (!src) return null;

  // Get just the filename without path and extension
  const filename = src.split('/').pop().replace(/\.[^.]+$/, '');

  // Remove leading timestamp prefix like "1770974414_"
  const withoutTimestamp = filename.replace(/^\d+_/, '');

  // Skip purely generic filenames (date markers, generic names)
  const generic = /^(sat|fri|sun|mon|tue|wed|thu)-?\d*(-[ud]-?p?)?$|^generell/i;
  if (generic.test(withoutTimestamp)) return null;

  // Replace hyphens with spaces and title-case
  const parts = withoutTimestamp
    .replace(/[-_]+/g, ' ')
    .replace(/\d{4,}/g, '')     // remove long numbers (years, IDs)
    .replace(/\b(final|new|v\d+|insta\d+x\d+|up|down)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (parts.length < 3) return null;

  // Title case
  return parts.replace(/\b\w/g, c => c.toUpperCase());
}

try {
  console.log('Fetching events page...');
  const response = await fetch(VENUE_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('Parsing events...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events = [];
  const seen = new Set();

  // Each event is a .programpost div
  $('.programpost').each((_, el) => {
    const $post = $(el);

    // Date from .datumdatum
    const dateText = $post.find('.datumdatum').text().trim();
    if (!dateText) return;

    const eventDate = parseUnderBronDate(dateText);
    if (!eventDate || isNaN(eventDate.getTime())) return;

    // Skip past events
    if (eventDate < today) return;

    // Try to get a name from the image filename
    const imgSrc = $post.find('img.thumbthumb').first().attr('src') || '';
    let name = nameFromImageSrc(imgSrc);

    // Fall back to generic name
    if (!name) {
      name = 'Under Bron Club Night';
    }

    // Deduplicate by (name + date)
    const key = `${name}-${eventDate.toISOString().split('T')[0]}`;
    if (seen.has(key)) return;
    seen.add(key);

    events.push({ name, eventDate });
  });

  console.log(`Found ${events.length} upcoming events`);

  if (events.length === 0) {
    console.log('No events found — this is non-fatal for a club venue.');
    await client.end();
    process.exit(0);
  }

  let success = 0;
  let failed = 0;

  for (const { name, eventDate } of events) {
    try {
      const dateStr = eventDate.toISOString().split('T')[0];
      const sourceId = `underbron-${name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 60)}-${dateStr}`;

      const event = {
        name,
        artist: name,
        venue: VENUE_NAME,
        date: eventDate,
        time: '22:00',
        genre: 'electronic',
        ticketSources: [{
          platform: 'venue-direct',
          url: 'https://www.underbron.com',
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
      console.log(`  OK: ${name} (${dateStr})`);
    } catch (error) {
      failed++;
      console.error(`  FAIL: ${name}: ${error.message}`);
    }
  }

  console.log(`\nComplete: ${success} saved, ${failed} failed`);
  await client.end();
  process.exit(0);
} catch (error) {
  console.error('Crawler failed:', error);
  await client.end();
  process.exit(1);
}
