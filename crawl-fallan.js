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
const VENUE_URL = 'https://www.fallan.nu/whats-on';
const VENUE_NAME = 'Fållan';

function parseFallanDate(dateStr, timeStr) {
  // Date format: "Feb 22, 2026" or "Mar 6, 2026"
  // Time format: "19:00"

  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  const dateMatch = dateStr.match(/(\w{3})\s+(\d{1,2}),?\s+(\d{4})/i);
  const timeMatch = timeStr?.match(/(\d{2}):(\d{2})/) || ['', '20', '00'];

  if (!dateMatch) {
    return null;
  }

  const monthName = dateMatch[1].toLowerCase();
  const day = parseInt(dateMatch[2]);
  const year = parseInt(dateMatch[3]);
  const hour = parseInt(timeMatch[1]);
  const minute = parseInt(timeMatch[2]);

  const month = months[monthName];
  if (month === undefined) {
    return null;
  }

  return new Date(year, month, day, hour, minute, 0, 0);
}

export async function crawl() {
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    console.log(`🎸 Crawling ${VENUE_NAME}...`);
    console.log('🌐 Launching browser...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log('📄 Loading Fållan events page...');
    await page.goto(VENUE_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for content to render
    console.log('⏳ Waiting for events to load...');
    await page.waitForTimeout(5000);

    console.log('🔍 Extracting events...');

    const events = await page.evaluate(() => {
      const eventData = [];

      // Strategy 1: Look for h3 elements with event names
      const h3Elements = document.querySelectorAll('h3');

      h3Elements.forEach(h3 => {
        const name = h3.textContent?.trim();
        if (!name || name.length < 2) return;

        // Skip navigation/menu items
        if (name.toLowerCase().includes('menu') ||
            name.toLowerCase().includes('subscribe') ||
            name.toLowerCase() === 'events') return;

        // Find the closest container that might have full event info
        let container = h3.parentElement;
        for (let i = 0; i < 5; i++) {
          if (!container) break;
          const text = container.textContent || '';

          // Check if this container has date and venue info
          if (text.match(/\w{3}\s+\d{1,2},?\s+\d{4}/) &&
              (text.includes('Fållan') || text.includes('fållan'))) {

            const dateMatch = text.match(/(\w{3})\s+(\d{1,2}),?\s+(\d{4})/i);
            const timeMatch = text.match(/(\d{2}:\d{2})/);

            if (dateMatch) {
              // Find event link
              const link = container.querySelector('a');
              const href = link?.getAttribute('href') || '';

              eventData.push({
                name: name,
                date: dateMatch[0],
                time: timeMatch ? timeMatch[1] : '20:00',
                href: href,
              });
              return; // Found event, stop searching up the DOM
            }
          }

          container = container.parentElement;
        }
      });

      // Strategy 2: If no events found, try looking for event cards/containers
      if (eventData.length === 0) {
        const containers = document.querySelectorAll('[class*="event"], [class*="card"], article');

        containers.forEach(container => {
          const h3 = container.querySelector('h3');
          const name = h3?.textContent?.trim();
          const text = container.textContent || '';

          if (!name) return;

          const dateMatch = text.match(/(\w{3})\s+(\d{1,2}),?\s+(\d{4})/i);
          const timeMatch = text.match(/(\d{2}:\d{2})/);

          if (dateMatch && (text.includes('Fållan') || text.includes('fållan'))) {
            const link = container.querySelector('a');

            eventData.push({
              name: name,
              date: dateMatch[0],
              time: timeMatch ? timeMatch[1] : '20:00',
              href: link?.getAttribute('href') || '',
            });
          }
        });
      }

      return eventData;
    });

    console.log(`\n📋 Found ${events.length} events`);

    let success = 0;
    let failed = 0;

    for (const eventData of events) {
      try {
        const eventDate = parseFallanDate(eventData.date, eventData.time);

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
            url: eventData.href.startsWith('http')
              ? eventData.href
              : eventData.href.startsWith('/')
              ? `https://www.fallan.nu${eventData.href}`
              : VENUE_URL,
            addedAt: new Date().toISOString(),
          }],
          sourceId: `fallan-${eventData.name}-${eventDate.toISOString().split('T')[0]}`,
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
