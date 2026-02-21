/**
 * Banan-Kompaniet (B-K) venue crawler
 *
 * Crawls: https://www.b-k.se/whats-on
 */

import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as cheerio from 'cheerio';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const VENUE_URL = 'https://www.b-k.se/whats-on';
const VENUE_NAME = 'Banan-Kompaniet';

console.log(`🎸 Crawling ${VENUE_NAME}...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

let events = [];

function parseDate(dateStr) {
  // Parse dates like "Mar 5, 2026" or "Apr 10, 2026"
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (e) {
    console.error(`Failed to parse date: ${dateStr}`, e);
  }
  return null;
}

function parseTime(timeStr) {
  // Parse time like "19:00" or "18:30"
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return {
      hour: parseInt(match[1]),
      minute: parseInt(match[2])
    };
  }
  return { hour: 20, minute: 0 };
}

try {
  console.log('📄 Fetching page...');
  const response = await fetch(VENUE_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('🔍 Parsing events...');

  // Find all links to event pages
  const eventLinks = $('a[href*="/whats-on/"]').toArray();
  console.log(`Found ${eventLinks.length} event links`);

  for (const element of eventLinks) {
    try {
      const $el = $(element);
      const eventUrl = $el.attr('href');

      if (!eventUrl || eventUrl === '/whats-on' || eventUrl === '/whats-on/') continue;

      // Get event name from h3
      const h3 = $el.find('h3');
      if (h3.length === 0) continue;

      let eventName = h3.text().trim();
      if (!eventName) continue;

      // Fix duplicated names (e.g., "EuropeEurope" -> "Europe")
      const halfLength = Math.floor(eventName.length / 2);
      const firstHalf = eventName.substring(0, halfLength);
      const secondHalf = eventName.substring(halfLength);
      if (firstHalf === secondHalf) {
        eventName = firstHalf;
      }

      console.log(`  Found event: ${eventName}`);

      // Get all text content
      const textContent = $el.text();

      // Extract date - look for date pattern
      const dateMatch = textContent.match(/([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/);
      if (!dateMatch) {
        console.log(`  ✗ No date found`);
        continue;
      }

      const dateStr = dateMatch[1];
      const eventDate = parseDate(dateStr);
      if (!eventDate) {
        console.log(`  ✗ Invalid date: ${dateStr}`);
        continue;
      }

      // Extract door time
      const timeMatch = textContent.match(/DOORS:\s*(\d{1,2}:\d{2})/i);
      let timeStr = '20:00';
      if (timeMatch) {
        timeStr = timeMatch[1];
      }

      const time = parseTime(timeStr);
      eventDate.setHours(time.hour, time.minute, 0, 0);

      const fullUrl = eventUrl.startsWith('http') ? eventUrl : `https://www.b-k.se${eventUrl}`;

      events.push({
        name: eventName,
        date: eventDate,
        time: timeStr,
        url: fullUrl,
      });

      console.log(`  ✓ ${eventName} - ${dateStr} at ${timeStr}`);
    } catch (error) {
      console.error(`  ✗ Error parsing event: ${error.message}`);
    }
  }

  console.log(`\n📋 Found ${events.length} events`);

  let success = 0;
  let failed = 0;

  for (const eventData of events) {
    try {
      const event = {
        name: eventData.name,
        artist: eventData.name,
        venue: VENUE_NAME,
        date: eventData.date,
        time: eventData.time,
        genre: 'other',
        ticketSources: [{
          platform: 'venue-direct',
          url: eventData.url,
          addedAt: new Date().toISOString(),
        }],
        sourceId: `banan-kompaniet-${eventData.name}-${eventData.date.toISOString().split('T')[0]}`,
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

  console.log(`\n✅ Complete: ${success} saved, ${failed} failed`);

  await client.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Crawler failed:', error);
  await client.end();
  process.exit(1);
}
