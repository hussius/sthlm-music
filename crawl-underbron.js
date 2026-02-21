import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as cheerio from 'cheerio';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const VENUE_URL = 'https://www.underbron.com/?view=program';
const VENUE_NAME = 'Under Bron';

console.log(`🎸 Crawling ${VENUE_NAME}...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

function parseUnderBronDate(dateStr) {
  // Parse dates like "21/2", "28/2" (day/month) or "28 FEB", "14 MAR"
  const currentYear = new Date().getFullYear();

  // Try format: "21/2"
  let match = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
  if (match) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]) - 1; // JS months are 0-indexed

    // Determine year - if month is in the past, assume next year
    const now = new Date();
    let year = currentYear;
    if (month < now.getMonth() || (month === now.getMonth() && day < now.getDate())) {
      year += 1;
    }

    return new Date(year, month, day, 22, 0, 0, 0); // Default to 22:00 (club opens late)
  }

  // Try format: "28 FEB"
  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3, maj: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, okt: 9, nov: 10, dec: 11
  };

  match = dateStr.match(/(\d{1,2})\s+(\w{3})/i);
  if (match) {
    const day = parseInt(match[1]);
    const monthName = match[2].toLowerCase();
    const month = months[monthName];

    if (month !== undefined) {
      const now = new Date();
      let year = currentYear;
      if (month < now.getMonth() || (month === now.getMonth() && day < now.getDate())) {
        year += 1;
      }

      return new Date(year, month, day, 22, 0, 0, 0);
    }
  }

  return null;
}

try {
  console.log('📄 Fetching events page...');

  const response = await fetch(VENUE_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const events = [];

  console.log('🔍 Parsing events...');

  // Find all elements that contain dates (DD/M or DD MMM format)
  $('*').each((i, elem) => {
    try {
      const text = $(elem).text().trim();

      // Look for date patterns
      if (!text.match(/\d{1,2}[\/\s](\d{1,2}|\w{3})/)) {
        return;
      }

      // Extract the date
      const dateMatch = text.match(/(\d{1,2}[\/\s](?:\d{1,2}|\w{3}))/);
      if (!dateMatch) return;

      const dateStr = dateMatch[1];
      const eventDate = parseUnderBronDate(dateStr);
      if (!eventDate) return;

      // Look for event name/title nearby
      // Try to find headings or text near this element
      const parent = $(elem).parent();
      const siblings = parent.siblings();

      let eventName = '';

      // Look for heading elements
      const heading = parent.find('h1, h2, h3, h4, strong').first().text().trim();
      if (heading && heading !== dateStr) {
        eventName = heading;
      }

      // If no heading, try image alt text
      if (!eventName) {
        const img = parent.find('img').first();
        const alt = img.attr('alt');
        if (alt && alt.length > 2) {
          eventName = alt;
        }
      }

      // If still no name, try text content (excluding date and prices)
      if (!eventName) {
        let fullText = parent.text().replace(dateStr, '').trim();
        // Remove price patterns like "100 sek", "22-23 Free"
        fullText = fullText.replace(/\d{1,2}-\d{1,2}\s+\w+/g, '').trim();
        fullText = fullText.replace(/\d+\s*sek/gi, '').trim();
        fullText = fullText.replace(/\+\d+yrs?/gi, '').trim();

        const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 2);
        if (lines.length > 0) {
          eventName = lines[0];
        }
      }

      // Only add if we have a meaningful event name
      if (eventName && eventName.length > 2 && !eventName.match(/^\d/)) {
        // Check if we already have this event
        const duplicate = events.find(e =>
          e.name === eventName && e.date.getTime() === eventDate.getTime()
        );

        if (!duplicate) {
          events.push({
            name: eventName,
            date: eventDate,
          });
        }
      }
    } catch (error) {
      // Skip problematic elements
    }
  });

  console.log(`\n📋 Found ${events.length} events`);

  let success = 0;
  let failed = 0;

  for (const eventData of events) {
    try {
      if (isNaN(eventData.date.getTime())) {
        failed++;
        continue;
      }

      const event = {
        name: eventData.name,
        artist: eventData.name,
        venue: VENUE_NAME,
        date: eventData.date,
        time: '22:00', // Under Bron typically opens at 22:00
        genre: 'electronic',
        ticketSources: [{
          platform: 'venue-direct',
          url: VENUE_URL,
          addedAt: new Date().toISOString(),
        }],
        sourceId: `underbron-${eventData.name}-${eventData.date.toISOString().split('T')[0]}`,
        sourcePlatform: 'venue-direct',
      };

      await db.insert(schema.events).values(event).onConflictDoUpdate({
        target: [schema.events.venue, schema.events.date],
        set: event,
      });

      success++;
      console.log(`✅ ${event.name} (${event.date.toISOString().split('T')[0]})`);
    } catch (error) {
      failed++;
      console.error(`❌ ${eventData.name}: ${error.message}`);
    }
  }

  console.log(`\n✅ Complete: ${success} saved, ${failed} failed`);

  await client.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Crawler failed:', error);
  process.exit(1);
}
