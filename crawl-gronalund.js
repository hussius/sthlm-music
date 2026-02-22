/**
 * Gröna Lund venue crawler
 *
 * Crawls: https://www.gronalund.com/page-data/konserter/page-data.json
 * Gatsby/Contentful site. Concert data is embedded in the Gatsby page-data JSON.
 * Structure: result.data.contentfulContentPage.listObjects[]
 * Each event: { title, countdownBlock.targetDateTime, pageLink.slug, location }
 * Date format: "2026-06-16T20:00"
 *
 * Note: Gröna Lund is seasonal (concerts mainly June-August).
 */

import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const PAGE_DATA_URL = 'https://www.gronalund.com/page-data/konserter/page-data.json';
const BASE_URL = 'https://www.gronalund.com';
const VENUE_NAME = 'Gröna Lund';

console.log(`🎸 Crawling ${VENUE_NAME}...`);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

try {
  console.log('📄 Fetching Gatsby page-data...');
  const response = await fetch(PAGE_DATA_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

  const json = await response.json();

  // Recursively search for the first 'listObjects' array anywhere in the JSON tree
  function findListObjects(obj) {
    if (!obj || typeof obj !== 'object') return null;
    if (Array.isArray(obj.listObjects) && obj.listObjects.length > 0) return obj.listObjects;
    for (const val of Object.values(obj)) {
      const found = findListObjects(val);
      if (found) return found;
    }
    return null;
  }

  const listObjects = findListObjects(json?.result?.data);
  if (!Array.isArray(listObjects)) {
    throw new Error('Could not find listObjects in page-data JSON — structure may have changed');
  }

  console.log(`Found ${listObjects.length} concert entries`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let success = 0;
  let failed = 0;

  for (const item of listObjects) {
    try {
      const title = item?.title?.trim();
      if (!title) continue;

      // "2026-06-16T20:00"
      const targetDateTime = item?.countdownBlock?.targetDateTime;
      if (!targetDateTime) {
        console.log(`  ⚠️  No date for: ${title}`);
        continue;
      }

      const eventDate = new Date(targetDateTime);
      if (isNaN(eventDate.getTime())) {
        console.log(`  ⚠️  Could not parse date "${targetDateTime}" for: ${title}`);
        continue;
      }

      // Skip past events
      if (eventDate < today) continue;

      const slug = item?.pageLink?.slug || '';
      const eventUrl = slug
        ? `${BASE_URL}${slug.startsWith('/') ? '' : '/'}${slug}`
        : BASE_URL;

      const stage = item?.location || '';
      const timeStr = `${String(eventDate.getHours()).padStart(2, '0')}:${String(eventDate.getMinutes()).padStart(2, '0')}`;

      const displayName = stage ? `${title} (${stage})` : title;

      const event = {
        name: displayName,
        artist: title,
        venue: VENUE_NAME,
        date: eventDate,
        time: timeStr,
        genre: 'other',
        ticketSources: [{
          platform: 'venue-direct',
          url: eventUrl,
          addedAt: new Date().toISOString(),
        }],
        sourceId: `gronalund-${title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 60)}-${eventDate.toISOString().split('T')[0]}`,
        sourcePlatform: 'venue-direct',
      };

      await db.insert(schema.events).values(event).onConflictDoUpdate({
        target: [schema.events.venue, schema.events.date],
        set: event,
      });

      success++;
      console.log(`✅ ${displayName} (${eventDate.toISOString().split('T')[0]} ${timeStr})`);
    } catch (error) {
      failed++;
      console.error(`❌ Error: ${error.message}`);
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
