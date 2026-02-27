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
const VENUE_URL = 'https://berns.se/sv/whats-on/';
const VENUE_NAME = 'Berns';

export async function crawl() {
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    console.log(`🎸 Crawling ${VENUE_NAME}...`);
    console.log('📄 Fetching page...');
    const response = await fetch(VENUE_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    console.log('🔍 Parsing events...');

    // Structure per event — 4 sibling <div>s inside a card container:
    //   <div><a href="/sv/kalender/slug/"><img></a></div>  ← image link
    //   <div>07 mars 2026</div>                            ← date (Swedish)
    //   <div><a href="/sv/kalender/slug/">Upptäck</a></div>← action links
    //   <div><h5>EVENT TITLE</h5></div>                   ← title
    //
    // Select only image links to get one anchor per event.
    const eventLinks = $('a[href*="/kalender/"]:has(img)').toArray();
    console.log(`Found ${eventLinks.length} raw calendar links`);

    const SWEDISH_MONTHS = {
      januari: 'January', februari: 'February', mars: 'March',
      april: 'April', maj: 'May', juni: 'June',
      juli: 'July', augusti: 'August', september: 'September',
      oktober: 'October', november: 'November', december: 'December',
    };

    const seen = new Set();
    let success = 0;
    let failed = 0;

    for (const element of eventLinks) {
      try {
        const $el = $(element);
        const eventUrl = $el.attr('href');
        if (!eventUrl) continue;
        if (seen.has(eventUrl)) continue;
        seen.add(eventUrl);

        // Navigate: <a><img></a> is inside a <div>; subsequent sibling divs hold date + title
        // All events' divs are children of the same container, so use nextAll() not siblings()
        // to avoid picking up a previous event's title/date.
        const $imageDiv = $el.parent();
        const $next = $imageDiv.nextAll();

        // Title is in the next sibling div containing a heading
        const title = $next.find('h1,h2,h3,h4,h5,h6').first().text().trim();
        if (!title) {
          console.log(`  ⚠️  No title for: ${eventUrl}`);
          continue;
        }

        // Date is in the next sibling div with text like "07 mars 2026" (Swedish month names)
        const dateText = $next.filter((_, el) => /\d{1,2}\s+\w+\s+\d{4}/.test($(el).text())).first().text().trim();
        if (!dateText) {
          console.log(`  ⚠️  No date for: ${title}`);
          continue;
        }

        // Parse "07 mars 2026" — translate Swedish month to English first
        const dateParts = dateText.match(/(\d{1,2})\s+([A-Za-zåäö]+)\s+(\d{4})/);
        if (!dateParts) {
          console.log(`  ⚠️  Could not parse date "${dateText}" for: ${title}`);
          continue;
        }
        const englishMonth = SWEDISH_MONTHS[dateParts[2].toLowerCase()] || dateParts[2];
        const eventDate = new Date(`${englishMonth} ${dateParts[1]} ${dateParts[3]}`);
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
