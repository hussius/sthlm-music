/**
 * Rival venue crawler
 *
 * Crawls: https://www.rival.se
 * WordPress + Bootstrap carousel site — all events are in static HTML.
 * Structure: #upcoming .carousel-item
 *   <h3>[Title with date appended, e.g. "Pepperland – Play The Beatles 28/2"]</h3>
 *   <p>[Description text]</p>
 *   <a class="btn" href="/shower/[slug]">Mer Info</a>
 *   <a class="btn" href="[ticketUrl]">Biljetter</a>
 * Date is typically embedded in the h3 as DD/M or DD-DD/M (range)
 */

import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as cheerio from 'cheerio';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const VENUE_URL = 'https://www.rival.se';
const BASE_URL = 'https://www.rival.se';
const VENUE_NAME = 'Rival';

const SWEDISH_MONTHS = {
  jan: 0, januari: 0,
  feb: 1, februari: 1,
  mars: 2, mar: 2,
  apr: 3, april: 3,
  maj: 4, may: 4,
  jun: 5, juni: 5,
  jul: 6, juli: 6,
  aug: 7, augusti: 7,
  sep: 8, september: 8,
  okt: 9, oktober: 9, oct: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

/**
 * Parse a date from Rival's h3 titles.
 * Formats seen: "28/2", "5-7/3" (range — use first date), "12 mars", "12 feb"
 * Returns a Date or null.
 */
function parseRivalDate(text) {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Format: "28/2" or "5-7/3" (DD/M or DD-DD/M)
  const slashMatch = text.match(/(\d{1,2})(?:-\d{1,2})?\/(\d{1,2})/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10) - 1; // 0-indexed
    let year = currentYear;
    const candidate = new Date(year, month, day, 19, 0, 0, 0);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (candidate < today) {
      year += 1;
    }
    return new Date(year, month, day, 19, 0, 0, 0);
  }

  // Format: "12 mars" or "12 februari"
  const textMatch = text.match(/(\d{1,2})\s+([a-zåäöA-ZÅÄÖ]+)/);
  if (textMatch) {
    const day = parseInt(textMatch[1], 10);
    const monthKey = textMatch[2].toLowerCase();
    const month = SWEDISH_MONTHS[monthKey];
    if (month !== undefined) {
      let year = currentYear;
      const candidate = new Date(year, month, day, 19, 0, 0, 0);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (candidate < today) {
        year += 1;
      }
      return new Date(year, month, day, 19, 0, 0, 0);
    }
  }

  return null;
}

/**
 * Strip the trailing date portion from a title like "Pepperland – Play The Beatles 28/2"
 * Returns just the event name.
 */
function stripDateFromTitle(title) {
  // Remove trailing "DD/M", "DD-DD/M" patterns
  let cleaned = title.replace(/\s*\d{1,2}(?:-\d{1,2})?\/\d{1,2}\s*$/, '').trim();
  // Remove trailing "DD mån" patterns
  cleaned = cleaned.replace(/\s+\d{1,2}\s+[a-zåäöA-ZÅÄÖ]{3,9}\s*$/, '').trim();
  return cleaned;
}

export async function crawl() {
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    console.log(`Crawling ${VENUE_NAME}...`);
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

    // Each event is a .carousel-item inside #upcoming
    $('#upcoming .carousel-item').each((_, el) => {
      const $item = $(el);

      // Title from h3
      const h3Text = $item.find('h3').first().text().trim();
      if (!h3Text) return;

      // Try to parse date from h3 title
      const eventDate = parseRivalDate(h3Text);
      if (!eventDate) {
        console.warn(`  [SKIP] No date found in: "${h3Text}"`);
        return;
      }

      if (eventDate < today) {
        console.warn(`  [SKIP] Past event: "${h3Text}" (${eventDate.toISOString().split('T')[0]})`);
        return;
      }

      // Strip date from title to get clean name
      const cleanName = stripDateFromTitle(h3Text) || h3Text;

      // Deduplicate by (name + date)
      const key = `${cleanName}-${eventDate.toISOString().split('T')[0]}`;
      if (seen.has(key)) return;
      seen.add(key);

      // Event URL: prefer the "Mer Info" link
      let eventUrl = VENUE_URL;
      $item.find('a.btn').each((_, a) => {
        const href = ($(a).attr('href') || '').trim();
        if (href.startsWith('/shower/') || href.includes('rival.se/shower/')) {
          eventUrl = href.startsWith('/') ? `${BASE_URL}${href}` : href;
        }
      });

      events.push({ name: cleanName, eventUrl, eventDate });
    });

    console.log(`Found ${events.length} upcoming events`);

    let success = 0;
    let failed = 0;

    for (const { name, eventUrl, eventDate } of events) {
      try {
        const dateStr = eventDate.toISOString().split('T')[0];
        const event = {
          name,
          artist: name,
          venue: VENUE_NAME,
          date: eventDate,
          time: '19:00',
          genre: 'other',
          ticketSources: [{
            platform: 'venue-direct',
            url: eventUrl,
            addedAt: new Date().toISOString(),
          }],
          sourceId: `rival-${name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 60)}-${dateStr}`,
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
