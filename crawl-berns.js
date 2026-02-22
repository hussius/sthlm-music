/**
 * Berns venue crawler
 *
 * Crawls: https://berns.se/whats-on
 * Structure: <div> <a><img></a> <p>27 February 2026</p> <a><h5>Title</h5></a> </div>
 * Note: two <a> tags per card — image link and title link. Date is sibling <p>.
 */

import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as cheerio from 'cheerio';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const VENUE_URL = 'https://berns.se/whats-on';
const VENUE_NAME = 'Berns';

console.log(`🎸 Crawling ${VENUE_NAME}...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

try {
  console.log('📄 Fetching page...');
  const response = await fetch(VENUE_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('🔍 Parsing events...');

  // Structure per event: <a><img></a> <div><h?>Title</h?><p>Date</p></div> <a>Explore</a>
  // Title + date live in the sibling <div> next to the image <a> link.
  const eventLinks = $('a[href*="/calendar/"]').toArray();
  console.log(`Found ${eventLinks.length} raw calendar links`);

  const seen = new Set();
  let success = 0;
  let failed = 0;

  for (const element of eventLinks) {
    try {
      const $el = $(element);
      const eventUrl = $el.attr('href');
      if (!eventUrl) continue;

      // Skip bare /calendar/ nav link and deduplicate slugs
      if (!/\/calendar\/.+/.test(eventUrl)) continue;
      if (seen.has(eventUrl)) continue;
      seen.add(eventUrl);

      // Title + date are in the sibling <div> (same card container)
      const $infoDiv = $el.siblings('div').first();
      const title = $infoDiv.find('h1,h2,h3,h4,h5,h6').first().text().trim();
      if (!title) {
        console.log(`  ⚠️  No title for: ${eventUrl}`);
        continue;
      }

      // Date format: "07 March 2026"
      const dateText = $infoDiv.find('p').first().text().trim();
      if (!dateText) {
        console.log(`  ⚠️  No date for: ${title}`);
        continue;
      }

      // Parse "07 March 2026" manually to avoid locale issues
      const dateParts = dateText.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
      if (!dateParts) {
        console.log(`  ⚠️  Could not parse date "${dateText}" for: ${title}`);
        continue;
      }
      const eventDate = new Date(`${dateParts[2]} ${dateParts[1]} ${dateParts[3]}`);
      if (isNaN(eventDate.getTime())) {
        console.log(`  ⚠️  Could not parse date "${dateText}" for: ${title}`);
        continue;
      }

      // Default show time to 20:00 (Berns doesn't show time on listing page)
      eventDate.setHours(20, 0, 0, 0);

      const fullUrl = eventUrl.startsWith('http') ? eventUrl : `https://berns.se${eventUrl}`;

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
        sourceId: `berns-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${eventDate.toISOString().split('T')[0]}`,
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
