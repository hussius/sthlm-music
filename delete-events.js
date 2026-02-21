/**
 * Delete specific events from the database
 *
 * Usage:
 *   node delete-events.js --preview           # Show what will be deleted
 *   node delete-events.js --confirm           # Actually delete
 */

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL || 'postgresql://dev:devpass@localhost:5432/stockholm_events');

// Define patterns for events to delete
const deletePatterns = [
  { name: 'KÖP BILJETT +', venue: 'Fylkingen' },
  { name: 'Köp biljett +', venue: null }, // null means any venue
  { name: '[object Object]', venue: null }, // Bad data from crawler
  { name: '%presentkort%', venue: null }, // Gift cards, not events
  // Add more patterns here as needed
];

async function findEventsToDelete() {
  const events = [];

  for (const pattern of deletePatterns) {
    let query;
    if (pattern.venue) {
      query = sql`
        SELECT id, name, artist, venue, date
        FROM events
        WHERE name ILIKE ${pattern.name}
          AND venue = ${pattern.venue}
      `;
    } else {
      query = sql`
        SELECT id, name, artist, venue, date
        FROM events
        WHERE name ILIKE ${pattern.name}
      `;
    }

    const results = await query;
    events.push(...results);
  }

  return events;
}

async function deleteEvents(eventIds) {
  const result = await sql`
    DELETE FROM events
    WHERE id = ANY(${eventIds})
  `;
  return result.count;
}

async function main() {
  const mode = process.argv[2];

  try {
    console.log('🔍 Finding events to delete...\n');
    const events = await findEventsToDelete();

    if (events.length === 0) {
      console.log('✅ No events found matching the patterns.');
      await sql.end();
      process.exit(0);
    }

    console.log(`📋 Found ${events.length} events:\n`);
    events.forEach((event, i) => {
      console.log(`${i + 1}. "${event.name}" at ${event.venue} (${event.date.toISOString().slice(0, 10)})`);
    });

    console.log();

    if (mode === '--confirm') {
      console.log('🗑️  Deleting events...');
      const eventIds = events.map(e => e.id);
      const deletedCount = await deleteEvents(eventIds);
      console.log(`✅ Deleted ${deletedCount} events.`);
    } else {
      console.log('ℹ️  Run with --confirm to actually delete these events.');
      console.log('   node delete-events.js --confirm');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
