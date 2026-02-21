import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as cheerio from 'cheerio';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const BASE_URL = 'https://slakthusen.se/';

console.log(`🎸 Crawling Slakthusen (all venues)...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

// Parse Swedish month names
function parseDate(day, month) {
  const months = {
    januari: 0, februari: 1, mars: 2, april: 3, maj: 4, juni: 5,
    juli: 6, augusti: 7, september: 8, oktober: 9, november: 10, december: 11
  };

  const monthNum = months[month.toLowerCase()];
  if (monthNum === undefined) {
    return null;
  }

  const dayNum = parseInt(day);
  if (isNaN(dayNum)) {
    return null;
  }

  // Determine year - if month is before current month, it's next year
  const now = new Date();
  const currentMonth = now.getMonth();
  let year = now.getFullYear();

  if (monthNum < currentMonth) {
    year += 1;
  }

  // Normalize to 20:00:00.000 to prevent duplicates
  return new Date(year, monthNum, dayNum, 20, 0, 0, 0);
}

function normalizeGenre(text) {
  const lower = text?.toLowerCase() || '';
  if (lower.includes('rock')) return 'rock';
  if (lower.includes('metal')) return 'metal';
  if (lower.includes('punk')) return 'punk';
  if (lower.includes('indie')) return 'indie';
  if (lower.includes('electronic')) return 'electronic';
  if (lower.includes('jazz')) return 'jazz';
  if (lower.includes('folk')) return 'folk';
  if (lower.includes('pop')) return 'pop';
  if (lower.includes('hip hop') || lower.includes('rap')) return 'hip-hop';
  return 'other';
}

try {
  const events = [];
  let page = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const url = page === 1 ? BASE_URL : `${BASE_URL}page/${page}/`;
    console.log(`📄 Fetching page ${page}: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      console.log(`⚠️  Page ${page} returned ${response.status}, stopping pagination`);
      break;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Find all event items - they're in <a> tags within the grid
    const pageEvents = [];

    $('a[href*="/"]').each((i, elem) => {
      try {
        const $elem = $(elem);

        // Check if this element contains event structure
        const dag = $elem.find('.dag').text().trim();
        const manad = $elem.find('.manad').text().trim();
        const titel = $elem.find('.titel').text().trim();
        const stalle = $elem.find('.stalle').text().trim();

        // Only process if we found all required fields
        if (!dag || !manad || !titel || !stalle) {
          return;
        }

        const eventDate = parseDate(dag, manad);
        if (!eventDate || isNaN(eventDate.getTime())) {
          console.log(`⚠️  Could not parse date: ${dag} ${manad}`);
          return;
        }

        const eventHref = $elem.attr('href');
        const ticketUrl = eventHref?.startsWith('http')
          ? eventHref
          : `https://slakthusen.se${eventHref}`;

        // Extract artist name - split on | to get artist part
        const artist = titel.includes('|') ? titel.split('|')[0].trim() : titel;

        pageEvents.push({
          name: titel,
          artist: artist,
          venue: stalle, // Use the venue from the event card
          date: eventDate,
          time: '20:00',
          genre: normalizeGenre(titel),
          ticketSources: [{
            platform: 'venue-direct',
            url: ticketUrl,
            addedAt: new Date().toISOString(),
          }],
          sourceId: `slakthusen-${stalle}-${titel}-${eventDate.toISOString().split('T')[0]}`,
          sourcePlatform: 'venue-direct',
        });

      } catch (error) {
        console.error(`⚠️  Error parsing event: ${error.message}`);
      }
    });

    if (pageEvents.length === 0) {
      console.log(`✅ No more events found on page ${page}, stopping pagination`);
      hasMorePages = false;
    } else {
      console.log(`📋 Found ${pageEvents.length} events on page ${page}`);
      events.push(...pageEvents);
      page++;
    }
  }

  console.log(`\n📊 Total events found: ${events.length}`);

  // Group by venue for summary
  const venueCount = {};
  events.forEach(event => {
    venueCount[event.venue] = (venueCount[event.venue] || 0) + 1;
  });

  console.log('\n📍 Events by venue:');
  Object.entries(venueCount).forEach(([venue, count]) => {
    console.log(`   ${venue}: ${count} events`);
  });

  let success = 0;
  let failed = 0;

  for (const event of events) {
    try {
      await db.insert(schema.events).values(event).onConflictDoUpdate({
        target: [schema.events.venue, schema.events.date],
        set: event,
      });
      success++;
      console.log(`✅ ${event.name} at ${event.venue} (${event.date.toISOString().split('T')[0]})`);
    } catch (error) {
      failed++;
      console.error(`❌ Failed to save "${event.name}": ${error.message}`);
    }
  }

  console.log(`\n✅ Complete: ${success} saved, ${failed} failed`);

  await client.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Crawler failed:', error);
  process.exit(1);
}
