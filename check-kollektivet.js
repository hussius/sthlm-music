import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

console.log('🔍 Checking Kollektivet Livet events...\n');

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client);

try {
  // Get all events with "Kollektivet" in venue name
  const kollektivetEvents = await db.execute(sql`
    SELECT name, venue, date, source_platform
    FROM events
    WHERE venue LIKE '%Kollektivet%'
    ORDER BY date
  `);

  const events = kollektivetEvents.rows || kollektivetEvents || [];
  console.log(`📊 Found ${events.length} Kollektivet events:\n`);

  events.forEach(event => {
    const date = new Date(event.date).toISOString().split('T')[0];
    console.log(`  ${date} | ${event.venue} | ${event.name}`);
  });

  // Get venue statistics
  console.log('\n\n📈 All venues with event counts:');
  const venues = await db.execute(sql`
    SELECT venue, COUNT(*) as count
    FROM events
    GROUP BY venue
    ORDER BY count DESC
  `);

  const venueList = venues.rows || venues || [];
  venueList.forEach(row => {
    console.log(`  ${row.venue}: ${row.count} events`);
  });

  // Check if Ticketmaster has more venues that might match
  console.log('\n\n🎫 Ticketmaster venues:');
  const tmVenues = await db.execute(sql`
    SELECT DISTINCT venue
    FROM events
    WHERE source_platform = 'ticketmaster'
    ORDER BY venue
  `);

  const tmList = tmVenues.rows || tmVenues || [];
  tmList.forEach(row => {
    console.log(`  - ${row.venue}`);
  });

  await client.end();
  process.exit(0);

} catch (error) {
  console.error('❌ Check failed:', error);
  await client.end();
  process.exit(1);
}
