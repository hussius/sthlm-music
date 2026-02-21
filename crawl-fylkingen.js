import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { chromium } from 'playwright';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const VENUE_URL = 'https://www.fylkingen.se/sv/events';
const VENUE_NAME = 'Fylkingen';

console.log(`🎸 Crawling ${VENUE_NAME}...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

function parseDate(dateStr) {
  // Handle various date formats
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }
  return null;
}

function normalizeGenre(text) {
  const lower = text?.toLowerCase() || '';
  if (lower.includes('electronic') || lower.includes('experimental')) return 'electronic';
  if (lower.includes('jazz')) return 'jazz';
  if (lower.includes('folk')) return 'folk';
  if (lower.includes('classical')) return 'classical';
  return 'other';
}

try {
  console.log('🌐 Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('📄 Loading events page...');
  await page.goto(VENUE_URL, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for events to load (adjust selector based on actual page)
  await page.waitForTimeout(3000); // Give React time to render

  console.log('🔍 Extracting events...');

  // Try various selectors to find events
  const events = await page.evaluate(() => {
    const eventElements = [];

    // Try to find event containers (adjust selectors as needed)
    const possibleSelectors = [
      'article',
      '[class*="event"]',
      '[class*="Event"]',
      'a[href*="/event/"]',
      'a[href*="/events/"]',
    ];

    for (const selector of possibleSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        elements.forEach(el => {
          const text = el.textContent?.trim() || '';
          const href = el.getAttribute('href') || '';
          if (text.length > 10) {
            eventElements.push({
              text: text.substring(0, 500),
              href,
              html: el.outerHTML.substring(0, 500),
            });
          }
        });
        break;
      }
    }

    return eventElements;
  });

  console.log(`\n📋 Found ${events.length} potential events`);

  if (events.length === 0) {
    console.log('\n⚠️  No events found. Taking screenshot for debugging...');
    await page.screenshot({ path: 'fylkingen-debug.png', fullPage: true });
    console.log('Screenshot saved to fylkingen-debug.png');

    // Get page text for debugging
    const bodyText = await page.evaluate(() => document.body.textContent);
    console.log('\nFirst 1000 chars of page:');
    console.log(bodyText.substring(0, 1000));
  }

  let success = 0;
  let failed = 0;

  for (const eventData of events.slice(0, 20)) { // Limit to first 20 for testing
    try {
      // Extract basic info from text
      const name = eventData.text.split('\n')[0].trim();
      if (!name || name.length < 3) continue;

      const now = new Date();

      const event = {
        name,
        artist: name,
        venue: VENUE_NAME,
        date: now, // Default to today - will need better date parsing
        time: '19:00',
        genre: normalizeGenre(eventData.text),
        ticketSources: [{
          platform: 'venue-direct',
          url: eventData.href.startsWith('http') ? eventData.href : `https://www.fylkingen.se${eventData.href}`,
          addedAt: new Date().toISOString(),
        }],
        sourceId: `fylkingen-${name}`,
        sourcePlatform: 'venue-direct',
      };

      await db.insert(schema.events).values(event).onConflictDoUpdate({
        target: [schema.events.venue, schema.events.date],
        set: event,
      });

      success++;
      console.log(`✅ ${name}`);
    } catch (error) {
      failed++;
      console.error(`❌ Error: ${error.message}`);
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
