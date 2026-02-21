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
const VENUE_URL = 'https://petsounds.se/bar';
const VENUE_NAME = 'Pet Sounds';

console.log(`🎸 Crawling ${VENUE_NAME}...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

function parsePetSoundsDate(dateStr, timeStr) {
  // Date format: "11/2" (day/month) or "26/2"
  // Time format: "19:00" or "21:00"

  const dateMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
  const timeMatch = timeStr?.match(/(\d{2}):(\d{2})/) || ['', '20', '00'];

  if (!dateMatch) {
    return null;
  }

  const day = parseInt(dateMatch[1]);
  const month = parseInt(dateMatch[2]) - 1; // JS months are 0-indexed
  const hour = parseInt(timeMatch[1]);
  const minute = parseInt(timeMatch[2]);

  // Determine year - if month is before current month, it's next year
  const now = new Date();
  const currentMonth = now.getMonth();
  let year = now.getFullYear();

  if (month < currentMonth) {
    year += 1;
  }

  return new Date(year, month, day, hour, minute, 0, 0);
}

try {
  console.log('🌐 Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('📄 Loading Pet Sounds page...');
  await page.goto(VENUE_URL, { waitUntil: 'networkidle', timeout: 30000 });

  // Click Events link and wait for popup
  console.log('🔍 Looking for Events link...');
  try {
    const eventsLink = await page.locator('text=Events').first();
    console.log('👆 Clicking Events...');
    await eventsLink.click();

    // Wait for popup/modal to appear
    console.log('⏳ Waiting for popup...');
    await page.waitForTimeout(3000);
  } catch (e) {
    console.log('⚠️  Could not click Events link:', e.message);
  }

  console.log('🔍 Extracting events from popup...');

  const events = await page.evaluate(() => {
    const eventData = [];

    // Find all text in the page
    const bodyText = document.body.innerText;

    // Look for "Kommande events" section
    const kommandeIndex = bodyText.indexOf('Kommande events');
    if (kommandeIndex === -1) {
      console.log('Could not find "Kommande events" text');
      return eventData;
    }

    // Get text after "Kommande events"
    const eventsText = bodyText.substring(kommandeIndex);

    // Split into lines and parse each line
    const lines = eventsText.split('\n');

    for (const line of lines) {
      // Match format: "11/2 HEARTWORN PRISGALA  19:00"
      // Pattern: date (dd/m or dd/mm) + spaces + name + spaces + time (HH:MM)
      const match = line.match(/^(\d{1,2}\/\d{1,2})\s+(.+?)\s+(\d{2}:\d{2})\s*$/);

      if (match) {
        const date = match[1];
        const name = match[2].trim();
        const time = match[3];

        eventData.push({
          date: date,
          name: name,
          time: time,
          fullText: line,
        });
      }
    }

    return eventData;
  });

  console.log(`\n📋 Found ${events.length} events`);

  let success = 0;
  let failed = 0;

  for (const eventData of events) {
    try {
      const eventDate = parsePetSoundsDate(eventData.date, eventData.time);

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
          url: VENUE_URL,
          addedAt: new Date().toISOString(),
        }],
        sourceId: `petsounds-${eventData.name}-${eventDate.toISOString().split('T')[0]}`,
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
