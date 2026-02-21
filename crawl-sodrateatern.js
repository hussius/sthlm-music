import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

// Set temp directory to avoid permission issues
const tmpDir = '/tmp/claude-crawlers';
try {
  mkdirSync(tmpDir, { recursive: true });
  process.env.TMPDIR = tmpDir;
} catch (e) {
  console.warn(`Could not create temp dir ${tmpDir}:`, e.message);
}

const DATABASE_URL = process.env.DATABASE_URL;
const VENUE_URL = 'https://sodrateatern.com/evenemang/musik-show/';
const VENUE_NAME = 'Södra Teatern';

console.log(`🎸 Crawling ${VENUE_NAME}...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

function parseSwedishDate(dateStr) {
  // Parse Swedish dates like "6 mars 2026" or "21 februari 2026"
  const months = {
    januari: 0, februari: 1, mars: 2, april: 3, maj: 4, juni: 5,
    juli: 6, augusti: 7, september: 8, oktober: 9, november: 10, december: 11
  };

  const match = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (match) {
    const day = parseInt(match[1]);
    const monthName = match[2].toLowerCase();
    const year = parseInt(match[3]);
    const month = months[monthName];

    if (month !== undefined) {
      return new Date(year, month, day, 20, 0, 0, 0);
    }
  }

  return null;
}

try {
  console.log('🌐 Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('📄 Loading Södra Teatern events page...');
  await page.goto(VENUE_URL, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for content to render
  console.log('⏳ Waiting for events to load...');
  await page.waitForTimeout(5000);

  console.log('🔍 Extracting events from JSON-LD...');

  const events = await page.evaluate(() => {
    const eventData = [];

    // Find JSON-LD script tags
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');

    jsonLdScripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);

        // Handle both single events and arrays of events
        const eventArray = Array.isArray(data) ? data : [data];

        eventArray.forEach(item => {
          // Check if it's an Event type
          if (item['@type'] === 'Event' && item.name && item.startDate) {
            eventData.push({
              name: item.name,
              date: item.startDate,
              url: item.url || '',
              location: item.location?.name || '',
            });
          }

          // Handle event series or multi-event objects
          if (item['@graph']) {
            item['@graph'].forEach(graphItem => {
              if (graphItem['@type'] === 'Event' && graphItem.name && graphItem.startDate) {
                eventData.push({
                  name: graphItem.name,
                  date: graphItem.startDate,
                  url: graphItem.url || '',
                  location: graphItem.location?.name || '',
                });
              }
            });
          }
        });
      } catch (e) {
        // Skip invalid JSON
      }
    });

    // If JSON-LD didn't work, try DOM extraction
    if (eventData.length === 0) {
      const eventCards = document.querySelectorAll('.event-item, .listing-events article, [class*="event"]');

      eventCards.forEach(card => {
        const h3 = card.querySelector('h3');
        const name = h3?.textContent?.trim();

        if (!name || name.length < 2) return;

        // Get text content
        const fullText = card.textContent || '';

        // Look for Swedish date pattern "6 mars 2026"
        const dateMatch = fullText.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
        if (!dateMatch) return;

        // Extract just the date string
        const dateStr = dateMatch[0];

        // Find event link
        const link = card.querySelector('a[href*="evenemang"], a[href*="event"]');
        const url = link?.getAttribute('href') || '';

        eventData.push({
          name: name,
          date: dateStr,
          url: url,
          location: 'Södra Teatern',
        });
      });
    }

    return eventData;
  });

  console.log(`\n📋 Found ${events.length} events`);

  let success = 0;
  let failed = 0;

  for (const eventData of events) {
    try {
      // Parse date - try ISO 8601 first, then Swedish format
      let eventDate;

      if (eventData.date.includes('T')) {
        // ISO 8601 format: "2026-03-06T18:30:00+00:00"
        eventDate = new Date(eventData.date);
      } else {
        // Try Swedish date format: "6 mars 2026"
        eventDate = parseSwedishDate(eventData.date);

        if (!eventDate) {
          console.log(`⚠️  ${eventData.name}: Could not parse date (${eventData.date.substring(0, 50)})`);
          failed++;
          continue;
        }
      }

      if (isNaN(eventDate.getTime())) {
        console.log(`⚠️  ${eventData.name}: Invalid date`);
        failed++;
        continue;
      }

      const event = {
        name: eventData.name,
        artist: eventData.name,
        venue: VENUE_NAME, // Consolidate all stages as "Södra Teatern"
        date: eventDate,
        time: eventDate.toTimeString().substring(0, 5),
        genre: 'other',
        ticketSources: [{
          platform: 'venue-direct',
          url: eventData.url || VENUE_URL,
          addedAt: new Date().toISOString(),
        }],
        sourceId: `sodrateatern-${eventData.name}-${eventDate.toISOString().split('T')[0]}`,
        sourcePlatform: 'venue-direct',
      };

      await db.insert(schema.events).values(event).onConflictDoUpdate({
        target: [schema.events.venue, schema.events.date],
        set: event,
      });

      success++;
      console.log(`✅ ${event.name} (${event.date.toISOString().split('T')[0]} ${event.time})`);
    } catch (error) {
      failed++;
      console.error(`❌ ${eventData.name}: ${error.message}`);
    }
  }

  await browser.close();

  console.log(`\n✅ Complete: ${success} saved, ${failed} failed`);

  await client.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Crawler failed:', error);
  process.exit(1);
}
