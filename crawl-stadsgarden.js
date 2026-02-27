import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as cheerio from 'cheerio';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const VENUE_NAME = 'Kollektivet Livet'; // Stadsgårdsterminalen is a stage of Kollektivet Livet
const VENUE_URL = 'https://stadsgardsterminalen.com/program/';

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

export async function crawl() {
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    console.log(`🎸 Crawling Stadsgårdsterminalen (Kollektivet Livet)...`);
    const events = [];

    console.log(`📄 Fetching ${VENUE_URL}...`);
    const response = await fetch(VENUE_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

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

        // Use <time datetime="2026-02-28 19:00:00"> attribute for exact date/time
        const datetimeAttr = $elem.find('time').attr('datetime');
        if (!datetimeAttr) {
          console.log(`    ⚠️  Event "${name}": No datetime attribute found`);
          return;
        }

        // Parse "2026-02-28 19:00:00" format
        const dateMatch = datetimeAttr.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
        if (!dateMatch) {
          console.log(`    ⚠️  Event "${name}": Could not parse datetime "${datetimeAttr}"`);
          return;
        }
        const [, year, month, day, hour, minute] = dateMatch;
        const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), 0, 0);

        if (isNaN(eventDate.getTime())) {
          console.log(`    ⚠️  Event "${name}": Invalid date`);
          return;
        }

        // Always store as 'Kollektivet Livet' so UI venue filter works
        // (sub-venue like "Stora Scen"/"Lilla Scen" stored via ticket URL)

        // Get ticket URL — prefer Tickster link, fall back to event page
        const ticketUrl = $elem.find('a[href*="tickster"], a[href*="blackplanet"]').attr('href');
        const eventPageUrl = $elem.find('a.read-more').attr('href')
          || $elem.find('a[href*="/event/"]').first().attr('href')
          || VENUE_URL;
        const finalTicketUrl = ticketUrl
          ? (ticketUrl.startsWith('http') ? ticketUrl : `https://stadsgardsterminalen.com${ticketUrl}`)
          : eventPageUrl;

        // Use event page slug as stable sourceId
        const eventSlug = eventPageUrl.replace(/.*\/event\//, '').replace(/\/$/, '') || name;
        const sourceId = `stadsgarden-${eventSlug}`;

        const timeStr = `${hour}:${minute}`;

        events.push({
          name,
          artist: name,
          venue: VENUE_NAME,
          date: eventDate,
          time: timeStr,
          genre: normalizeGenre(name),
          ticketSources: [{
            platform: 'venue-direct',
            url: finalTicketUrl,
            addedAt: new Date().toISOString(),
          }],
          sourceId,
          sourcePlatform: 'venue-direct',
        });

      } catch (error) {
        console.error(`⚠️  Error parsing event: ${error.message}`);
      }
    });

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
