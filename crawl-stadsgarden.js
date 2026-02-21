import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as cheerio from 'cheerio';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const VENUE_NAME = 'Kollektivet Livet'; // Stadsgårdsterminalen is a stage of Kollektivet Livet
const VENUE_URL = 'https://stadsgardsterminalen.com/program/';

console.log(`🎸 Crawling Stadsgårdsterminalen (Kollektivet Livet)...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

// Parse Swedish dates
function parseSwedishDate(dateStr) {
  const months = {
    jan: 0, januari: 0,
    feb: 1, februari: 1,
    mar: 2, mars: 2,
    apr: 3, april: 3,
    maj: 4,
    jun: 5, juni: 5,
    jul: 6, juli: 6,
    aug: 7, augusti: 7,
    sep: 8, september: 8,
    okt: 9, oktober: 9,
    nov: 10, november: 10,
    dec: 11, december: 11
  };

  // Handle "Idag" (today) - normalize to 20:00:00.000
  if (dateStr.toLowerCase().includes('idag')) {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 20, 0, 0, 0);
  }

  // Handle "Imorgon" (tomorrow) - normalize to 20:00:00.000
  if (dateStr.toLowerCase().includes('imorgon')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 20, 0, 0, 0);
  }

  // Handle date ranges - just take the first date
  if (dateStr.includes(' till ')) {
    dateStr = dateStr.split(' till ')[0];
  }

  // Parse various formats:
  // "27 feb.", "fre 27 feb.", "tors 5 mars", "mån 1 juni"
  const match = dateStr.match(/(\d+)\s+(\w+)/);
  if (match) {
    const day = parseInt(match[1]);
    const monthName = match[2].toLowerCase().replace('.', '');
    const month = months[monthName];

    if (month !== undefined) {
      const year = new Date().getFullYear();
      const date = new Date(year, month, day, 20, 0, 0, 0); // Normalized to 20:00:00.000

      // If date is in the past, assume next year
      if (date < new Date()) {
        date.setFullYear(year + 1);
      }

      return date;
    }
  }

  return null;
}

function normalizeGenre(text) {
  const lower = text?.toLowerCase() || '';
  if (lower.includes('rock')) return 'rock';
  if (lower.includes('jazz')) return 'jazz';
  if (lower.includes('folk')) return 'folk';
  if (lower.includes('electronic') || lower.includes('techno')) return 'electronic';
  if (lower.includes('pop')) return 'pop';
  return 'other';
}

try {
  const events = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const url = offset === 0 ? VENUE_URL : `${VENUE_URL}?offset=${offset}`;
    console.log(`📄 Fetching page with offset ${offset}...`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const pageEvents = [];

    // Find event elements using .event class
    $('.event').each((i, elem) => {
      try {
        const $elem = $(elem);

        // Get event name from h3
        const name = $elem.find('h3').text().trim();
        if (!name) {
          console.log(`    ⚠️  Event ${i + 1}: No name found`);
          return;
        }

        // Get full text to parse date and venue
        const fullText = $elem.text();

        // Extract date
        let dateStr = null;
        const lines = fullText.split('\n').map(l => l.trim()).filter(l => l);

        for (let line of lines) {
          if (line.match(/\d+\s+(jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)/i) ||
              line.toLowerCase() === 'idag' ||
              line.toLowerCase() === 'imorgon') {
            dateStr = line;
            break;
          }
        }

        if (!dateStr) {
          console.log(`    ⚠️  Event "${name}": No date found`);
          return;
        }

        // Extract venue info
        let venueInfo = VENUE_NAME;
        const venueMatch = fullText.match(/Kollektivet Livet[^K]*/);
        if (venueMatch) {
          venueInfo = venueMatch[0].split('\n')[0].trim();
        }

        // Get ticket URL (optional)
        const ticketUrl = $elem.find('a[href*="tickster"], a[href*="blackplanet"]').attr('href');
        const finalTicketUrl = ticketUrl
          ? (ticketUrl.startsWith('http') ? ticketUrl : `https://stadsgardsterminalen.com${ticketUrl}`)
          : `https://stadsgardsterminalen.com/program/`;

        const eventDate = parseSwedishDate(dateStr);
        if (!eventDate || isNaN(eventDate.getTime())) {
          console.log(`    ⚠️  Event "${name}": Invalid date "${dateStr}"`);
          return;
        }

        pageEvents.push({
          name,
          artist: name,
          venue: venueInfo,
          date: eventDate,
          time: '20:00',
          genre: normalizeGenre(name),
          ticketSources: [{
            platform: 'venue-direct',
            url: finalTicketUrl,
            addedAt: new Date().toISOString(),
          }],
          sourceId: `stadsgarden-${name}-${dateStr}`,
          sourcePlatform: 'venue-direct',
        });

      } catch (error) {
        console.error(`⚠️  Error parsing event: ${error.message}`);
      }
    });

    const totalOnPage = $('.event').length;
    console.log(`  Found ${pageEvents.length} events on this page (${totalOnPage} total elements)`);

    if (totalOnPage === 0) {
      hasMore = false;
      console.log('  No more events, stopping pagination');
    } else {
      events.push(...pageEvents);
      offset += 12; // Page size is 12
    }
  }

  console.log(`\n📋 Found ${events.length} events`);

  let success = 0;
  let failed = 0;

  for (const event of events) {
    try {
      await db.insert(schema.events).values(event).onConflictDoUpdate({
        target: [schema.events.venue, schema.events.date],
        set: event,
      });
      success++;
      console.log(`✅ ${event.name} (${event.date.toISOString().split('T')[0]})`);
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
