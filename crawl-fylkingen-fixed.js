import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { chromium } from 'playwright';
import * as schema from './dist/db/schema.js';
import { mkdirSync } from 'fs';

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
const VENUE_URL = 'https://www.fylkingen.se/sv/events';
const VENUE_NAME = 'Fylkingen';

function parseFylkingenDate(dateStr) {
  // Format: "Saturday28 February 202619:30"
  const months = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  };

  const match = dateStr.match(/(\d{1,2})\s*(\w+)\s*(\d{4})(\d{2}):(\d{2})/i);
  if (match) {
    const day = parseInt(match[1]);
    const monthName = match[2].toLowerCase();
    const year = parseInt(match[3]);
    const hour = parseInt(match[4]);
    const minute = parseInt(match[5]);
    const month = months[monthName];

    if (month !== undefined) {
      return new Date(year, month, day, hour, minute, 0, 0);
    }
  }

  return null;
}

export async function crawl() {
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    console.log(`🎸 Crawling ${VENUE_NAME}...`);
    console.log('🌐 Launching browser...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log('📄 Loading events page...');
    await page.goto(VENUE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    console.log('🔍 Extracting events...');

    const events = await page.evaluate(() => {
      const eventData = [];

      // Get all H2 elements (event names)
      const h2Elements = document.querySelectorAll('h2');

      h2Elements.forEach(h2 => {
        const name = h2.textContent?.trim();
        if (!name || name === 'Next Events') return;

        // Find the parent container
        const container = h2.closest('div');
        if (!container) return;

        // Get the full text of the container
        const fullText = container.textContent || '';

        // Find event link
        const link = container.querySelector('a[href*="/events/"]');
        const href = link?.getAttribute('href') || '';

        eventData.push({
          name,
          fullText,
          href,
        });
      });

      return eventData;
    });

    console.log(`\n📋 Found ${events.length} events`);

    let success = 0;
    let failed = 0;

    for (const eventData of events) {
      try {
        // Parse date from fullText
        const eventDate = parseFylkingenDate(eventData.fullText);

        if (!eventDate || isNaN(eventDate.getTime())) {
          console.log(`⚠️  ${eventData.name}: Could not parse date`);
          failed++;
          continue;
        }

        const event = {
          name: eventData.name,
          artist: eventData.name,
          venue: VENUE_NAME,
          date: eventDate,
          time: eventDate.toTimeString().substring(0, 5), // HH:MM
          genre: 'electronic', // Fylkingen is experimental/electronic
          ticketSources: [{
            platform: 'venue-direct',
            url: eventData.href.startsWith('http')
              ? eventData.href
              : `https://www.fylkingen.se${eventData.href}`,
            addedAt: new Date().toISOString(),
          }],
          sourceId: `fylkingen-${eventData.name}-${eventDate.toISOString().split('T')[0]}`,
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
