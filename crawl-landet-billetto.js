import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { chromium } from 'playwright';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const SEARCH_URL = 'https://billetto.se/search?text=stockholm&category%5B%5D=music';
const VENUE_NAME = 'Landet';
const VENUE_FILTER = 'Landet Hägersten';

console.log(`🎸 Crawling ${VENUE_NAME} via Billetto...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

function parseSwedishDate(dateStr) {
  // Parse Swedish dates like "22 feb 2026" or "15 mar"
  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3, maj: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, okt: 9, nov: 10, dec: 11
  };

  const match = dateStr.match(/(\d{1,2})\s+(\w{3})\s*(\d{4})?/i);
  if (match) {
    const day = parseInt(match[1]);
    const monthName = match[2].toLowerCase();
    const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
    const month = months[monthName];

    if (month !== undefined) {
      return new Date(year, month, day, 20, 0, 0, 0);
    }
  }

  return null;
}

try {
  console.log('🌐 Launching browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage', '--no-sandbox'],
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  });
  const page = await context.newPage();

  console.log('📄 Loading Billetto search page...');
  await page.goto(SEARCH_URL, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for events to load
  console.log('⏳ Waiting for search results...');
  await page.waitForTimeout(5000);

  console.log('🔍 Extracting events...');

  const events = await page.evaluate((venueFilter) => {
    const eventData = [];

    // Try multiple selectors for event cards
    const possibleSelectors = [
      'article',
      '[class*="event"]',
      '[class*="card"]',
      'a[href*="/e/"]',
      '[data-testid*="event"]',
      '.ant-card',
    ];

    let eventElements = [];

    for (const selector of possibleSelectors) {
      const elems = document.querySelectorAll(selector);
      if (elems.length > 0) {
        console.log(`Found ${elems.length} elements with selector: ${selector}`);
        eventElements = Array.from(elems);
        break;
      }
    }

    // If no structured elements found, look for links to event pages
    if (eventElements.length === 0) {
      eventElements = Array.from(document.querySelectorAll('a[href*="/e/"]'));
      console.log(`Found ${eventElements.length} event links`);
    }

    eventElements.forEach(elem => {
      try {
        // Get event name from various possible locations
        const nameElem = elem.querySelector('h1, h2, h3, h4, [class*="title"]');
        const name = nameElem?.textContent?.trim() || elem.textContent?.trim().split('\n')[0];

        if (!name || name.length < 2) return;

        // Get full text to search for venue and date
        const fullText = elem.textContent || '';

        // Check if this event is at Landet, Hägersten
        if (!fullText.includes(venueFilter)) {
          return;
        }

        // Try to find date
        const dateMatch = fullText.match(/(\d{1,2})\s+(\w{3})\s*(\d{4})?/i);
        const dateStr = dateMatch ? dateMatch[0] : '';

        // Get event URL
        const link = elem.tagName === 'A' ? elem : elem.querySelector('a');
        const href = link?.getAttribute('href') || '';

        if (dateStr) {
          eventData.push({
            name: name,
            date: dateStr,
            url: href,
            fullText: fullText.substring(0, 200),
          });
        }
      } catch (e) {
        // Skip problematic elements
      }
    });

    return eventData;
  }, VENUE_FILTER);

  console.log(`\n📋 Found ${events.length} events at ${VENUE_FILTER}`);

  let success = 0;
  let failed = 0;

  for (const eventData of events) {
    try {
      const eventDate = parseSwedishDate(eventData.date);

      if (!eventDate || isNaN(eventDate.getTime())) {
        console.log(`⚠️  ${eventData.name}: Could not parse date (${eventData.date})`);
        failed++;
        continue;
      }

      const event = {
        name: eventData.name,
        artist: eventData.name,
        venue: VENUE_NAME,
        date: eventDate,
        time: '20:00',
        genre: 'other',
        ticketSources: [{
          platform: 'billetto',
          url: eventData.url.startsWith('http')
            ? eventData.url
            : `https://billetto.se${eventData.url}`,
          addedAt: new Date().toISOString(),
        }],
        sourceId: `billetto-landet-${eventData.name}-${eventDate.toISOString().split('T')[0]}`,
        sourcePlatform: 'billetto',
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

  await browser.close();

  console.log(`\n✅ Complete: ${success} saved, ${failed} failed`);

  await client.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Crawler failed:', error);
  process.exit(1);
}
