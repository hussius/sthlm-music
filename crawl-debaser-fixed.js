import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as cheerio from 'cheerio';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const VENUE_URL = 'https://www.debaser.se/kalender';

// Parse Debaser date format: "21Feb2026"
function parseDebaserDate(dateStr) {
  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  const match = dateStr.match(/(\d{1,2})(\w{3})(\d{4})/i);
  if (match) {
    const day = parseInt(match[1]);
    const monthName = match[2].toLowerCase();
    const year = parseInt(match[3]);
    const month = months[monthName];

    if (month !== undefined) {
      return new Date(year, month, day, 20, 0, 0, 0); // Normalized to 20:00:00.000
    }
  }

  return null;
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

export async function crawl() {
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    console.log(`🎸 Crawling Debaser (concerts only)...`);
    const response = await fetch(VENUE_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    console.log(`📄 Fetched calendar, filtering concerts...`);

    const events = [];

    // Find all event items
    $('.evenitemwhite').each((i, elem) => {
      try {
        const $elem = $(elem);
        const linkText = $elem.find('a[href*="/events/"]').first().text().trim();

        // Skip if not a concert
        if (!linkText.includes('CONCERT')) {
          return;
        }

        // Parse the format: "25Feb2026WedBJ BarhamCONCERTDebaser NovaAmericana"
        // Extract date (at beginning)
        const dateMatch = linkText.match(/^(\d{1,2}\w{3}\d{4})/);
        if (!dateMatch) return;

        const dateStr = dateMatch[1];
        const eventDate = parseDebaserDate(dateStr);
        if (!eventDate || isNaN(eventDate.getTime())) return;

        // Remove date from string
        const afterDate = linkText.substring(dateStr.length);

        // Split on CONCERT to get name and venue
        const parts = afterDate.split('CONCERT');
        if (parts.length < 2) return;

        // Extract name (remove day name like "Wed", "Thu", etc.)
        let name = parts[0].replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i, '').trim();
        if (!name) return;

        // Extract venue (first part before any genre descriptions)
        const venueText = parts[1].trim();
        let venue = 'Debaser';
        if (venueText.includes('Debaser Strand')) {
          venue = 'Debaser Strand';
        } else if (venueText.includes('Debaser Nova')) {
          venue = 'Debaser Nova';
        }

        // Get event link for ticket URL
        const eventHref = $elem.find('a[href*="/events/"]').first().attr('href');
        const ticketUrl = eventHref ? `https://www.debaser.se${eventHref}` : 'https://www.debaser.se/kalender';

        events.push({
          name,
          artist: name,
          venue,
          date: eventDate,
          time: '20:00',
          genre: normalizeGenre(venueText),
          ticketSources: [{
            platform: 'venue-direct',
            url: ticketUrl,
            addedAt: new Date().toISOString(),
          }],
          sourceId: `debaser-${name}-${dateStr}`,
          sourcePlatform: 'venue-direct',
        });

      } catch (error) {
        console.error(`⚠️  Error parsing event: ${error.message}`);
      }
    });

    console.log(`\n📋 Found ${events.length} concert events`);

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
