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
const VENUE_URL = 'https://www.fasching.se/kalendarium/?date=0&st=&view=default&c=2&o=calendar&t=96';
const VENUE_NAME = 'Fasching';

console.log(`🎸 Crawling ${VENUE_NAME}...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

function parseFaschingDate(dateStr) {
  // Try to parse date from URL hash format: #2026-02-21T20-00
  const hashMatch = dateStr.match(/#(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})/);
  if (hashMatch) {
    const year = parseInt(hashMatch[1]);
    const month = parseInt(hashMatch[2]) - 1; // JS months are 0-indexed
    const day = parseInt(hashMatch[3]);
    const hour = parseInt(hashMatch[4]);
    const minute = parseInt(hashMatch[5]);
    return new Date(year, month, day, hour, minute, 0, 0);
  }

  // Try ISO format: 2026-02-21T20:00
  const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1]);
    const month = parseInt(isoMatch[2]) - 1;
    const day = parseInt(isoMatch[3]);
    const hour = parseInt(isoMatch[4]);
    const minute = parseInt(isoMatch[5]);
    return new Date(year, month, day, hour, minute, 0, 0);
  }

  return null;
}

try {
  console.log('🌐 Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('📄 Loading calendar page...');
  await page.goto(VENUE_URL, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for content to render
  console.log('⏳ Waiting for events to load...');
  await page.waitForTimeout(5000);

  console.log('🔍 Extracting events...');

  const events = await page.evaluate(() => {
    const eventData = [];

    // Find event links - they have date hash format #YYYY-MM-DDTHH-MM
    const links = document.querySelectorAll('a[href*="#"]');

    links.forEach(link => {
      const href = link.getAttribute('href');

      // Only process links with date hash format
      if (!href || !href.match(/#\d{4}-\d{2}-\d{2}T\d{2}-\d{2}/)) {
        return;
      }

      // Skip utility links
      if (href.includes('wp-admin') ||
          href.includes('wp-content') ||
          href.includes('kontakt') ||
          href.includes('about') ||
          href.includes('om-') ||
          href.toLowerCase().includes('köp') ||
          href.toLowerCase().includes('boka')) {
        return;
      }

      // Look for event name in h3, h2, or strong text
      const nameElement = link.querySelector('h3, h2, strong, .title, [class*="title"]');
      const name = nameElement?.textContent?.trim() || link.textContent?.trim();

      // Skip if no meaningful name or very short
      if (!name || name.length < 3) {
        return;
      }

      // Skip button/utility text
      const skipTexts = ['läs mer', 'köp biljett', 'boka', 'ej förköp', 'fri entré', 'utsålt'];
      if (skipTexts.some(skip => name.toLowerCase().includes(skip))) {
        return;
      }

      // Try to find date/time information
      const timeElement = link.querySelector('time, .date, [class*="date"], [class*="time"]');
      const timeText = timeElement?.textContent?.trim() || '';
      const dateAttribute = timeElement?.getAttribute('datetime') || '';

      eventData.push({
        name: name,
        href: href,
        timeText: timeText,
        dateAttribute: dateAttribute,
        fullText: link.textContent?.trim() || '',
      });
    });

    return eventData;
  });

  console.log(`\n📋 Found ${events.length} potential events`);

  let success = 0;
  let failed = 0;

  for (const eventData of events) {
    try {
      // Try to parse date from href hash, datetime attribute, or time text
      let eventDate = null;

      if (eventData.href.includes('#')) {
        eventDate = parseFaschingDate(eventData.href);
      }

      if (!eventDate && eventData.dateAttribute) {
        eventDate = parseFaschingDate(eventData.dateAttribute);
      }

      if (!eventDate) {
        // If we can't find a date, skip this event
        console.log(`⚠️  ${eventData.name}: Could not parse date`);
        failed++;
        continue;
      }

      if (isNaN(eventDate.getTime())) {
        console.log(`⚠️  ${eventData.name}: Invalid date`);
        failed++;
        continue;
      }

      const event = {
        name: eventData.name,
        artist: eventData.name,
        venue: VENUE_NAME,
        date: eventDate,
        time: eventDate.toTimeString().substring(0, 5), // HH:MM
        genre: 'jazz', // Fasching is primarily a jazz club
        ticketSources: [{
          platform: 'venue-direct',
          url: eventData.href.startsWith('http')
            ? eventData.href
            : `https://www.fasching.se${eventData.href}`,
          addedAt: new Date().toISOString(),
        }],
        sourceId: `fasching-${eventData.name}-${eventDate.toISOString().split('T')[0]}`,
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
