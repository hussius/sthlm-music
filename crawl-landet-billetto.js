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
const BILLETTO_URL = 'https://billetto.se/c/music-c?location_slug%5B%5D=stockholm';
const VENUE_NAME = 'Landet';

console.log(`🎸 Crawling ${VENUE_NAME} via Billetto...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

function parseSwedishDate(dateStr) {
  const months = {
    jan: 0, feb: 1, mar: 2, mars: 2, apr: 3, maj: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, okt: 9, nov: 10, dec: 11
  };

  const cleaned = dateStr.toLowerCase().replace(/\./g, '').trim();

  // Format: "apr 17 2026 19:30" or "apr 17 2026"
  let match = cleaned.match(/(\w{3,4})\s+(\d{1,2})\s+(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (match) {
    const month = months[match[1]];
    if (month !== undefined) {
      return new Date(parseInt(match[3]), month, parseInt(match[2]),
        match[4] ? parseInt(match[4]) : 20, match[5] ? parseInt(match[5]) : 0, 0, 0);
    }
  }

  // Format: "22 feb 2026"
  match = cleaned.match(/(\d{1,2})\s+(\w{3,4})\s*(\d{4})?/);
  if (match) {
    const month = months[match[2]];
    if (month !== undefined) {
      return new Date(match[3] ? parseInt(match[3]) : new Date().getFullYear(),
        month, parseInt(match[1]), 20, 0, 0, 0);
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
  const page = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  }).then(ctx => ctx.newPage());

  console.log('📄 Loading Billetto music page (Stockholm)...');
  await page.goto(BILLETTO_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);

  console.log('🔍 Extracting Landet events...');

  const events = await page.evaluate(() => {
    const eventData = [];

    // Each event card has a link to /e/<slug>
    const eventLinks = Array.from(document.querySelectorAll('a[href*="/e/"]'));

    eventLinks.forEach(link => {
      try {
        const href = link.getAttribute('href') || '';
        const container = link.closest('article') || link.closest('li') ||
                          link.closest('[class*="card"]') || link.closest('div[class]') || link;
        const fullText = container.textContent || '';

        // Match venue via Billetto's "Plats: VenueName" field — avoids matching
        // "landet" as a common Swedish word in event descriptions
        const venueMatch = fullText.match(/Plats:\s*([^\n,]+)/i);
        const venue = venueMatch ? venueMatch[1].trim() : '';
        if (!venue.startsWith('Landet')) return;

        // Event name from heading
        const heading = container.querySelector('h1, h2, h3, h4, h5');
        const name = heading?.textContent?.trim() || link.textContent?.trim().split('\n')[0]?.trim();
        if (!name || name.length < 2) return;

        // Date — Billetto renders e.g. "apr. 17 2026 19:30"
        const dateMatch = fullText.match(/(\w{3,4}\.?\s+\d{1,2}\s+\d{4}\s+\d{1,2}:\d{2})/i) ||
                          fullText.match(/(\d{1,2}\s+\w{3,4}\.?\s+\d{4})/i);
        if (!dateMatch) return;

        eventData.push({
          name,
          date: dateMatch[1].trim(),
          url: href.startsWith('http') ? href : `https://billetto.se${href}`,
        });
      } catch (e) {
        // skip
      }
    });

    return eventData;
  });

  await browser.close();

  console.log(`\n📋 Found ${events.length} Landet events`);

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
        time: eventDate.toTimeString().substring(0, 5),
        genre: 'other',
        ticketSources: [{
          platform: 'billetto',
          url: eventData.url,
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

  console.log(`\n✅ Complete: ${success} saved, ${failed} failed`);

  await client.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Crawler failed:', error);
  process.exit(1);
}
