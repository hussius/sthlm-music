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
const VENUE_URL = 'https://nalen.com/sv/konserter-event';
const VENUE_NAME = 'Nalen';

console.log(`🎸 Crawling ${VENUE_NAME}...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

try {
  console.log('🌐 Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('📄 Loading Nalen events page...');
  await page.goto(VENUE_URL, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for content to render
  console.log('⏳ Waiting for events to load...');
  await page.waitForTimeout(5000);

  console.log('🔍 Extracting events from JSON data...');

  const events = await page.evaluate(() => {
    const eventData = [];

    // Extract plain text from Nalen's ProseMirror rich-text format
    const extractText = (node) => {
      if (typeof node === 'string') return node;
      if (!node || typeof node !== 'object') return '';
      if (node.text) return node.text;
      if (Array.isArray(node.content)) return node.content.map(extractText).join('');
      return '';
    };

    // Try to extract JSON data from script tags
    const scripts = document.querySelectorAll('script[type="application/json"]');

    scripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);

        // Recursively search for event data with artistName and startDate
        const findEvents = (obj) => {
          if (!obj || typeof obj !== 'object') return;

          // Check if this object looks like an event
          if (obj.artistName && obj.startDate) {
            // artistName is a ProseMirror rich-text object — extract plain text
            const name = typeof obj.artistName === 'string'
              ? obj.artistName
              : extractText(obj.artistName).trim();
            const date = typeof obj.startDate === 'string' ? obj.startDate : null;

            // Only add if both name and date are valid strings
            if (name && date) {
              eventData.push({
                name: name,
                date: date,
                price: typeof obj.price === 'string' ? obj.price : '',
                support: typeof obj.sideKickName === 'string' ? obj.sideKickName : '',
                url: obj.artistPageUrl?.cached_url || obj.cached_url || '',
              });
            }
          }

          // Recursively search nested objects and arrays
          for (const key in obj) {
            if (typeof obj[key] === 'object') {
              findEvents(obj[key]);
            }
          }
        };

        findEvents(data);
      } catch (e) {
        // Skip invalid JSON
      }
    });

    // If JSON extraction didn't work, try DOM selectors
    if (eventData.length === 0) {
      const eventCards = document.querySelectorAll('a[href*="/konsert/"], a[href*="/event/"], article, .event, [class*="event"]');

      eventCards.forEach(card => {
        const nameElem = card.querySelector('h1, h2, h3, h4, .title, [class*="title"], [class*="artist"]');
        const dateElem = card.querySelector('time, .date, [class*="date"]');

        const name = nameElem?.textContent?.trim();
        const dateText = dateElem?.textContent?.trim() || dateElem?.getAttribute('datetime');
        const href = card.getAttribute('href');

        if (name && dateText) {
          eventData.push({
            name: name,
            date: dateText,
            price: '',
            support: '',
            url: href || '',
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
      // Parse date - format is "2026-05-31 19:00"
      const dateMatch = eventData.date.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);

      if (!dateMatch) {
        console.log(`⚠️  ${eventData.name}: Could not parse date (${eventData.date})`);
        failed++;
        continue;
      }

      const year = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]) - 1; // JS months are 0-indexed
      const day = parseInt(dateMatch[3]);
      const hour = parseInt(dateMatch[4]);
      const minute = parseInt(dateMatch[5]);

      const eventDate = new Date(year, month, day, hour, minute, 0, 0);

      if (isNaN(eventDate.getTime())) {
        console.log(`⚠️  ${eventData.name}: Invalid date`);
        failed++;
        continue;
      }

      // Build full event name with support act if present
      let fullName = eventData.name;
      if (eventData.support) {
        fullName += ` + ${eventData.support}`;
      }

      const event = {
        name: fullName,
        artist: eventData.name,
        venue: VENUE_NAME,
        date: eventDate,
        time: eventDate.toTimeString().substring(0, 5),
        genre: 'other',
        ticketSources: [{
          platform: 'venue-direct',
          url: eventData.url.startsWith('http')
            ? eventData.url
            : `https://nalen.com/${eventData.url}`,
          addedAt: new Date().toISOString(),
        }],
        sourceId: `nalen-${eventData.name}-${eventDate.toISOString().split('T')[0]}`,
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
