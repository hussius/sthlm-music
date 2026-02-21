import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

try {
  // Get total count
  const totalResult = await db.execute(sql`SELECT COUNT(*) as count FROM events`);
  console.log(`\n📊 Total events: ${totalResult[0].count}\n`);

  // Get count by venue
  const venueResult = await db.execute(sql`
    SELECT venue, COUNT(*) as count
    FROM events
    GROUP BY venue
    ORDER BY count DESC
  `);

  console.log('Events by venue:');
  console.log('================');
  venueResult.forEach(row => {
    console.log(`${row.venue}: ${row.count} events`);
  });

  await client.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error);
  await client.end();
  process.exit(1);
}
