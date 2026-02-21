import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { chromium } from 'playwright';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const VENUE_URL = 'https://www.b-k.se/whats-on';
const VENUE_NAME = 'Banankompaniet';

console.log(`🎸 Crawling ${VENUE_NAME}...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

function parseBKDate(dateStr, timeStr) {
  // Parse date format: "Mar 5, 2026" or "Nov 7, 2026"
  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  const dateMatch = dateStr.match(/(\w{3})\s+(\d{1,2}),?\s+(\d{4})/i);
  if (!dateMatch) return null;

  const monthName = dateMatch[1].toLowerCase();
  const day = parseInt(dateMatch[2]);
  const year = parseInt(dateMatch[3]);
  const month = months[monthName];

  if (month === undefined) return null;

  // Parse time "19:00" or "18.30"
  const timeMatch = timeStr?.match(/(\d{1,2})[:.](\d{2})/);
  const hour = timeMatch ? parseInt(timeMatch[1]) : 20;
  const minute = timeMatch ? parseInt(timeMatch[2]) : 0;

  return new Date(year, month, day, hour, minute, 0, 0);
}

try {
  console.log('🌐 Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('📄 Loading B-K events page...');
  await page.goto(VENUE_URL, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for content to render
  console.log('⏳ Waiting for events to load...');
  await page.waitForTimeout(5000);

  console.log('🔍 Extracting events...');

  const events = await page.evaluate(() => {
    const eventData = [];

    // Try different selectors for event cards
    const possibleSelectors = [
      'a[href*="/whats-on/"]',
      '[class*="event"]',
      '[class*="card"]',
      'article',
      '.w-dyn-item',
    ];

    let eventElements = [];

    for (const selector of possibleSelectors) {
      const elems = document.querySelectorAll(selector);
      if (elems.length > 0) {
        // Filter to only event links, not the main /whats-on page
        if (selector.includes('href')) {
          eventElements = Array.from(elems).filter(e => {
            const href = e.getAttribute('href');
            return href && href.includes('/whats-on/') && href !== '/whats-on';
          });
        } else {
          eventElements = Array.from(elems);
        }

        if (eventElements.length > 0) {
          break;
        }
      }
    }

    eventElements.forEach(elem => {
      try {
        // Get event name from heading or title
        const nameElem = elem.querySelector('h1, h2, h3, h4, [class*="title"], [class*="name"]');
        const name = nameElem?.textContent?.trim();

        if (!name || name.length < 2) return;

        // Get full text to extract date and time
        const fullText = elem.textContent || '';

        // Look for date pattern "Mar 5, 2026" or "Nov 7, 2026"
        const dateMatch = fullText.match(/(\w{3})\s+(\d{1,2}),?\s+(\d{4})/i);
        if (!dateMatch) return;

        const dateStr = dateMatch[0];

        // Look for time pattern "19:00" or "18.30"
        const timeMatch = fullText.match(/(\d{1,2})[:.](\d{2})/);
        const timeStr = timeMatch ? timeMatch[0] : '20:00';

        // Get event URL
        const link = elem.tagName === 'A' ? elem : elem.querySelector('a[href*="/whats-on/"]');
        const href = link?.getAttribute('href') || '';

        eventData.push({
          name: name,
          date: dateStr,
          time: timeStr,
          url: href,
        });
      } catch (e) {
        // Skip problematic elements
      }
    });

    return eventData;
  });

  console.log(`\n📋 Found ${events.length} events`);

  let success = 0;
  let failed = 0;

  for (const eventData of events) {
    try {
      const eventDate = parseBKDate(eventData.date, eventData.time);

      if (!eventDate || isNaN(eventDate.getTime())) {
        console.log(`⚠️  ${eventData.name}: Could not parse date (${eventData.date} ${eventData.time})`);
        failed++;
        continue;
      }

      const event = {
        name: eventData.name,
        artist: eventData.name,
        venue: VENUE_NAME,
        date: eventDate,
        time: eventDate.toTimeString().substring(0, 5),
        genre: 'other',
        ticketSources: [{
          platform: 'venue-direct',
          url: eventData.url.startsWith('http')
            ? eventData.url
            : `https://www.b-k.se${eventData.url}`,
          addedAt: new Date().toISOString(),
        }],
        sourceId: `bk-${eventData.name}-${eventDate.toISOString().split('T')[0]}`,
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
