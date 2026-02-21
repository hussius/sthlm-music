import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

const client = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(client);

console.log('📊 Checking venues in database...\n');

try {
  // Get distinct venues with counts
  const result = await db.execute(sql`
    SELECT venue, COUNT(*) as count
    FROM events
    GROUP BY venue
    ORDER BY count DESC
  `);

  console.log('Venues in database:\n');
  result.forEach(row => {
    console.log(`  ${row.venue}: ${row.count} events`);
  });

  console.log(`\nTotal: ${result.length} unique venues`);

  await client.end();
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}
