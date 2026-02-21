import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

console.log('🔄 Consolidating Stadsgårdsterminalen into Kollektivet Livet...\n');

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client);

try {
  // Count events before
  const before = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM events
    WHERE venue = 'Stadsgårdsterminalen'
  `);

  const beforeRows = before.rows || before || [];
  const beforeCount = beforeRows[0]?.count || 0;
  console.log(`📊 Found ${beforeCount} Stadsgårdsterminalen events to consolidate\n`);

  // Update to Kollektivet Livet
  const result = await db.execute(sql`
    UPDATE events
    SET venue = 'Kollektivet Livet'
    WHERE venue = 'Stadsgårdsterminalen'
  `);

  console.log(`✅ Updated ${result.rowCount || 0} events to "Kollektivet Livet"\n`);

  // Show Kollektivet Livet event count
  const after = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM events
    WHERE venue = 'Kollektivet Livet'
  `);

  const afterRows = after.rows || after || [];
  const afterCount = afterRows[0]?.count || 0;
  console.log(`📈 Kollektivet Livet now has ${afterCount} total events\n`);

  // Show all venues
  console.log('📊 Current venues in database:');
  const venues = await db.execute(sql`
    SELECT venue, COUNT(*) as count
    FROM events
    GROUP BY venue
    ORDER BY count DESC
  `);

  const venueList = venues.rows || venues || [];
  venueList.forEach(row => {
    console.log(`   ${row.venue}: ${row.count} events`);
  });

  await client.end();
  console.log('\n✅ Consolidation complete!');
  process.exit(0);

} catch (error) {
  console.error('❌ Consolidation failed:', error);
  await client.end();
  process.exit(1);
}
