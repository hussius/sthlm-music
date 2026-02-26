/**
 * B-K venue crawler
 *
 * Crawls: https://www.b-k.se/whats-on
 * Webflow site with static event listing. Events are anchor tags linking to /whats-on/[slug].
 *
 * Structure:
 *   <a href="/whats-on/[slug]">
 *     <section class="event-card-2">
 *       <h3 class="event-headline-text-top">Artist Name</h3>
 *       <div class="text-block-19">Mar 5, 2026</div>
 *       ...DOORS:19:00...
 *     </section>
 *   </a>
 *
 * Note: Some event links may appear twice (Webflow renders them in multiple sections).
 * Deduplicated by href value.
 */

import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './dist/db/schema.js';
import { load } from 'cheerio';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const WHATS_ON_URL = 'https://www.b-k.se/whats-on';
const VENUE_NAME = 'B-K';

console.log(`Crawling ${VENUE_NAME}...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

// Parse date strings like "Mar 5, 2026", "March 5, 2026", "Apr 2, 2026"
function parseEventDate(dateText) {
  if (!dateText) return null;

  const MONTHS = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    january: 0, february: 1, march: 2, april: 3, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  };

  const cleaned = dateText.trim();

  // Try "Mar 5, 2026" or "March 5, 2026"
  const match = cleaned.match(/^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (match) {
    const monthIdx = MONTHS[match[1].toLowerCase()];
    if (monthIdx !== undefined) {
      return new Date(parseInt(match[3], 10), monthIdx, parseInt(match[2], 10));
    }
  }

  // Fallback: native Date constructor
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) return parsed;

  return null;
}

try {
  console.log('Fetching B-K whats-on page...');
  const response = await fetch(WHATS_ON_URL, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml',
      'User-Agent': 'Mozilla/5.0 (compatible; StockholmEventsBot/1.0)',
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

  const html = await response.text();
  const $ = load(html);

  const links = $('a[href^="/whats-on/"]');
  console.log(`Found ${links.length} event links (before deduplication)`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Collect events first (cheerio each is sync, DB inserts are async)
  const seenHrefs = new Set();
  const eventsToInsert = [];

  links.each((i, el) => {
    const link = $(el);
    const href = link.attr('href');

    // Deduplicate by href
    if (!href || seenHrefs.has(href)) return;
    seenHrefs.add(href);

    // Title: primary h3, fallback to heading/title class
    let title = link.find('h3').first().text().trim();
    if (!title) {
      title = link.find('[class*="headline"], [class*="title"]').first().text().trim();
    }
    if (!title) return;

    // Date from .text-block-19 (Webflow date display block)
    let dateText = link.find('.text-block-19').first().text().trim();
    if (!dateText) {
      // Fallback: regex on full link text
      const allText = link.text();
      const m = allText.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b/i);
      dateText = m ? m[0] : '';
    }

    if (!dateText) {
      console.log(`  Warning: No date found for: ${title} (${href})`);
      return;
    }

    const eventDate = parseEventDate(dateText);
    if (!eventDate || isNaN(eventDate.getTime())) {
      console.log(`  Warning: Could not parse date "${dateText}" for: ${title}`);
      return;
    }

    // Skip past events
    if (eventDate < today) return;

    // Doors time from text content (format: "DOORS:19:00")
    const allText = link.text();
    const doorsMatch = allText.match(/DOORS:(\d{2}:\d{2})/i);
    const timeStr = doorsMatch ? doorsMatch[1] : '19:00';

    const dateStr = eventDate.toISOString().split('T')[0];
    const eventUrl = `https://www.b-k.se${href}`;
    const sourceId = `bk-${title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 60)}-${dateStr}`;

    eventsToInsert.push({
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
      sourceId,
      sourcePlatform: 'venue-direct',
    });
  });

  console.log(`Collected ${eventsToInsert.length} future events to save`);

  let success = 0;
  let failed = 0;

  for (const event of eventsToInsert) {
    try {
      await db.insert(schema.events).values(event).onConflictDoUpdate({
        target: [schema.events.venue, schema.events.date],
        set: event,
      });
      success++;
      console.log(`Saved: ${event.name} (${event.date.toISOString().split('T')[0]} ${event.time})`);
    } catch (error) {
      failed++;
      console.error(`Error saving ${event.name}: ${error.message}`);
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
