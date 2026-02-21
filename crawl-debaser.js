import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as cheerio from 'cheerio';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const VENUE_URL = 'https://www.debaser.se/kalender';

console.log(`🎸 Crawling Debaser (concerts only)...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

// Parse Debaser dates: "3 Mar 2026 Tue"
function parseDebaserDate(dateStr) {
  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  const match = dateStr.match(/(\d+)\s+(\w+)\s+(\d{4})/i);
  if (match) {
    const day = parseInt(match[1]);
    const monthName = match[2].toLowerCase();
    const year = parseInt(match[3]);
    const month = months[monthName];

    if (month !== undefined) {
      return new Date(year, month, day, 20, 0, 0); // Default 20:00
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

try {
  const response = await fetch(VENUE_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  console.log(`📄 Fetched calendar, filtering concerts...`);

  const events = [];
  let currentDate = null;

  // Parse each collection item
  $('.collection-item').each((i, elem) => {
    try {
      const $elem = $(elem);

      // Check if this is a date header
      const dateText = $elem.find('.date-sticky, .calendar-data').text().trim();
      if (dateText && dateText.match(/\d+\s+\w+\s+\d{4}/)) {
        currentDate = dateText;
        return; // Skip to next item
      }

      // Check if this is a concert
      const isConcert = $elem.find('#CONCERT, #KONSERT').length > 0 ||
                       $elem.text().includes('#CONCERT') ||
                       $elem.text().includes('KONSERT');

      if (!isConcert || !currentDate) return;

      // Get event name - try various selectors
      const name = $elem.find('h2, h3, h4, .event-title, a[href^="/events/"]').first().text().trim();
      if (!name || name.length < 2) return;

      // Get venue (Debaser Strand or Debaser Nova)
      const fullText = $elem.text();
      let venue = 'Debaser';
      if (fullText.includes('Strand')) venue = 'Debaser Strand';
      else if (fullText.includes('Nova')) venue = 'Debaser Nova';

      // Get ticket URL
      const ticketUrl = $elem.find('a[href*="tickster"]').attr('href');
      if (!ticketUrl) return;

      // Parse date
      const eventDate = parseDebaserDate(currentDate);
      if (!eventDate || isNaN(eventDate.getTime())) {
        console.error(`⚠️  Invalid date: ${currentDate}`);
        return;
      }

      // Get genre from text if available
      const genre = normalizeGenre(fullText);

      events.push({
        name,
        artist: name,
        venue,
        date: eventDate,
        time: '20:00',
        genre,
        ticketSources: [{
          platform: 'venue-direct',
          url: ticketUrl.startsWith('http') ? ticketUrl : `https://${ticketUrl}`,
          addedAt: new Date().toISOString(),
        }],
        sourceId: `debaser-${name}-${currentDate}`,
        sourcePlatform: 'venue-direct',
      });

    } catch (error) {
      console.error(`⚠️  Error parsing event: ${error.message}`);
    }
  });

  console.log(`\n📋 Found ${events.length} concert events`);

  if (events.length === 0) {
    console.log('\n⚠️  No concerts found. The HTML structure might have changed.');
    console.log('First 1000 chars of page:');
    console.log($('body').text().substring(0, 1000));
  }

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
