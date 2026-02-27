/**
 * Cirkus venue crawler
 *
 * Crawls: https://cirkus.se/evenemang/ (paginated, up to ~6 pages)
 */

import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as cheerio from 'cheerio';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const BASE_URL = 'https://cirkus.se';
const VENUE_NAME = 'Cirkus';

const MONTHS = {
  jan: 0, feb: 1, mars: 2, apr: 3, maj: 4, jun: 5, juni: 5,
  jul: 6, juli: 6, aug: 7, sep: 8, okt: 9, nov: 10, dec: 11,
};

/**
 * Parse Swedish date like "sön 22 feb", "fre 27 mars", "tis 03 mars–ons 11 mars"
 * Returns the start date.
 */
function parseSwedishDate(dateText) {
  // Take only the start date (before any "–" for date ranges)
  const startPart = dateText.split('–')[0].trim();

  // Match: dayAbbrev + dayNumber + monthName (e.g. "sön 22 feb" or "sön22feb")
  const match = startPart.match(/\w+\s*(\d{1,2})\s*(\w+)/);
  if (!match) return null;

  const day = parseInt(match[1]);
  const monthStr = match[2].toLowerCase().replace(/\.$/, '');
  const month = MONTHS[monthStr];

  if (month === undefined || isNaN(day)) return null;

  const now = new Date();
  const currentYear = now.getFullYear();

  // Use current year; if date has passed, use next year
  let date = new Date(currentYear, month, day, 20, 0, 0, 0);
  if (date < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    date = new Date(currentYear + 1, month, day, 20, 0, 0, 0);
  }

  return date;
}

export async function crawl() {
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });

  let success = 0;
  let failed = 0;
  const seen = new Set();

  try {
    console.log(`🎸 Crawling ${VENUE_NAME}...`);

    for (let page = 1; page <= 10; page++) {
      const url = page === 1
        ? `${BASE_URL}/evenemang/`
        : `${BASE_URL}/evenemang/page/${page}/`;

      console.log(`\n📄 Fetching page ${page}: ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`  ↩ No more pages (404)`);
          break;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Event links: <a href="/sv/evenemang/[slug]/"> cards
      const eventLinks = $('a[href^="/sv/evenemang/"]').toArray().filter(el => {
        const href = $(el).attr('href') || '';
        // Skip the parent /sv/evenemang/ listing link itself
        return href !== '/sv/evenemang/' && href !== '/sv/evenemang';
      });

      if (eventLinks.length === 0) {
        console.log(`  ↩ No events found, stopping pagination`);
        break;
      }

      console.log(`  Found ${eventLinks.length} event links`);

      for (const element of eventLinks) {
        try {
          const $el = $(element);
          const href = $el.attr('href');
          if (!href || seen.has(href)) continue;
          seen.add(href);

          // Only process links that contain a heading (event cards, not category filter links)
          const headingEl = $el.find('h1,h2,h3,h4,h5,h6').first();
          if (!headingEl.length) continue;
          const title = headingEl.text().trim();

          if (!title || title.length < 2) continue;

          // Date is a SIBLING of the <a> tag, not inside it.
          // Parent text includes both date and title. Use \s* because
          // <strong>22</strong> collapses spaces: "sön22feb" in .text().
          const parentText = $el.parent().text();
          const dateMatch = parentText.match(/(mån|tis|ons|tor|fre|lör|sön)\s*(\d{1,2})\s*(jan|feb|mars|apr|maj|jun|juli?|aug|sep|okt|nov|dec)/i);
          if (!dateMatch) {
            console.log(`  ⚠️  No date for: ${title}`);
            continue;
          }

          const dateText = dateMatch[0];
          const eventDate = parseSwedishDate(dateText);
          if (!eventDate) {
            console.log(`  ⚠️  Could not parse date "${dateText}" for: ${title}`);
            continue;
          }

          const fullUrl = `${BASE_URL}${href}`;

          const event = {
            name: title,
            artist: title,
            venue: VENUE_NAME,
            date: eventDate,
            time: '20:00',
            genre: 'other',
            ticketSources: [{
              platform: 'venue-direct',
              url: fullUrl,
              addedAt: new Date().toISOString(),
            }],
            sourceId: `cirkus-${title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 60)}-${eventDate.toISOString().split('T')[0]}`,
            sourcePlatform: 'venue-direct',
          };

          await db.insert(schema.events).values(event).onConflictDoUpdate({
            target: [schema.events.venue, schema.events.date],
            set: event,
          });

          success++;
          console.log(`  ✅ ${title} (${eventDate.toISOString().split('T')[0]})`);
        } catch (error) {
          failed++;
          console.error(`  ❌ Error: ${error.message}`);
        }
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
