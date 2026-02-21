import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const API_KEY = process.env.TICKETMASTER_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

console.log('🚀 Starting Ticketmaster crawler...');

// Database setup
const client = postgres(DATABASE_URL, { max: 10, connect_timeout: 10 });
const db = drizzle(client, { schema });

// Rate limiting
let requestCount = 0;
let lastRequestTime = 0;

async function rateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 200) {
    await new Promise(resolve => setTimeout(resolve, 200 - elapsed));
  }
  lastRequestTime = Date.now();
  requestCount++;
}

// Date formatting
function formatDate(date) {
  return date.toISOString().split('.')[0] + 'Z';
}

// Normalize venue
function normalizeVenue(name) {
  // Consolidate Kollektivet Livet stages into single venue
  if (name.includes('Kollektivet')) {
    return 'Kollektivet Livet';
  }

  const mapping = {
    'Slaktkyrkan': 'Slaktkyrkan',
    'Hus 7': 'Hus 7',
    'Fasching': 'Fasching',
    'Nalen': 'Nalen',
    'Fylkingen': 'Fylkingen',
    'Slakthuset': 'Slakthuset',
    'Fållan': 'Fållan',
    'Landet': 'Landet',
    'Mosebacke': 'Mosebacke',
    'Kägelbanan': 'Kägelbanan',
    'Pet Sounds': 'Pet Sounds',
    'Debaser': 'Debaser',
  };
  return mapping[name] || name;
}

// Normalize genre
function normalizeGenre(name) {
  const lower = name.toLowerCase();
  if (lower.includes('rock')) return 'rock';
  if (lower.includes('pop')) return 'pop';
  if (lower.includes('electronic') || lower.includes('techno') || lower.includes('house')) return 'electronic';
  if (lower.includes('jazz')) return 'jazz';
  if (lower.includes('hip hop') || lower.includes('rap')) return 'hip-hop';
  if (lower.includes('metal')) return 'metal';
  if (lower.includes('indie')) return 'indie';
  if (lower.includes('folk')) return 'folk';
  if (lower.includes('classical')) return 'classical';
  if (lower.includes('world')) return 'world';
  return 'other';
}

// Main crawl
try {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 12);

  console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

  let page = 0;
  let success = 0;
  let failed = 0;
  let totalPages = null;

  while (true) {
    await rateLimit();

    const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${API_KEY}&city=Stockholm&countryCode=SE&classificationName=Music&startDateTime=${formatDate(startDate)}&endDateTime=${formatDate(endDate)}&page=${page}&size=200`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`❌ API error: ${response.status} ${response.statusText}`);
      break;
    }

    const data = await response.json();
    const events = data._embedded?.events || [];

    if (totalPages === null) {
      totalPages = data.page.totalPages;
      console.log(`📊 Total pages to fetch: ${totalPages} (${data.page.totalElements} total events)`);
    }

    if (events.length === 0) {
      console.log(`✅ No more events on page ${page}. Done!`);
      break;
    }

    console.log(`📄 Page ${page + 1}/${totalPages}: Processing ${events.length} events`);

    for (const event of events) {
      try {
        const venueName = event._embedded?.venues?.[0]?.name;
        if (!venueName) {
          if (failed < 5) console.error(`⚠️  Skipped (no venue): ${event.name}`);
          failed++;
          continue;
        }

        const artist = event._embedded?.attractions?.[0]?.name || event.name;
        const genre = event.classifications?.[0]?.genre?.name || 'Other';
        const localDate = event.dates?.start?.localDate;
        const localTime = event.dates?.start?.localTime || '20:00';

        if (!localDate) {
          if (failed < 5) console.error(`⚠️  Skipped (no date): ${event.name} at ${venueName}`);
          failed++;
          continue;
        }

        // Parse date with better error handling
        // localTime might be "19:30" or "19:30:00" - handle both
        const timeWithSeconds = localTime.includes(':00:') ? localTime.split(':').slice(0, 2).join(':') + ':00' :
                               localTime.split(':').length === 2 ? localTime + ':00' : localTime;
        const dateTimeString = `${localDate}T${timeWithSeconds}`;
        // Normalize to remove milliseconds
        const eventDate = new Date(dateTimeString);
        eventDate.setMilliseconds(0);

        if (isNaN(eventDate.getTime())) {
          if (failed < 5) console.error(`⚠️  Invalid date for event ${event.name}: ${dateTimeString}`);
          failed++;
          continue;
        }

        const eventData = {
          name: event.name,
          artist: artist,
          venue: normalizeVenue(venueName),
          date: eventDate,
          time: localTime,
          genre: normalizeGenre(genre),
          ticketSources: [{
            platform: 'ticketmaster',
            url: event.url,
            addedAt: new Date().toISOString(),
          }],
          sourceId: event.id,
          sourcePlatform: 'ticketmaster',
        };

        await db.insert(schema.events).values(eventData).onConflictDoUpdate({
          target: [schema.events.venue, schema.events.date],
          set: eventData,
        });

        success++;
      } catch (error) {
        failed++;
        if (failed <= 10) {
          console.error(`⚠️  Error saving event "${event.name}": ${error.message}`);
          if (error.message.includes('violates')) {
            console.error(`    Full error:`, error);
          }
        }
      }
    }

    // Check if more pages exist
    if (page >= data.page.totalPages - 1) {
      console.log(`✅ Reached last page (${page + 1}/${totalPages})`);
      break;
    }

    page++;

    // Progress update
    if (page % 5 === 0) {
      console.log(`⏳ Progress: ${success} saved, ${failed} failed so far...`);
    }
  }

  console.log(`\n✅ Crawl complete!`);
  console.log(`📊 Saved: ${success}, Failed: ${failed}`);
  console.log(`📊 API requests: ${requestCount}`);

  await client.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Crawler failed:', error);
  process.exit(1);
}
