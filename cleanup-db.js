import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql, eq, and } from 'drizzle-orm';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

console.log('🧹 Cleaning up database...\n');

try {
  // 1. Consolidate B-K to Banan-Kompaniet
  console.log('📍 Consolidating B-K → Banan-Kompaniet...');
  const bkResult = await db.execute(sql`
    UPDATE events
    SET venue = 'Banankompaniet'
    WHERE venue = 'B-K'
  `);
  console.log(`   Updated ${bkResult.rowCount || 0} events\n`);

  // 2. Delete Presentkort event
  console.log('🗑️  Deleting Presentkort event...');
  const presentkortResult = await db.execute(sql`
    DELETE FROM events
    WHERE name LIKE '%Presentkort%'
    OR name = 'Presentkort'
  `);
  console.log(`   Deleted ${presentkortResult.rowCount || 0} events\n`);

  // 3. Fix duplicated event names (like "EuropeEurope" -> "Europe")
  console.log('🔧 Fixing duplicated names...');
  const events = await db.select().from(schema.events);
  let fixed = 0;

  for (const event of events) {
    const name = event.name;
    const halfLength = Math.floor(name.length / 2);
    const firstHalf = name.substring(0, halfLength);
    const secondHalf = name.substring(halfLength);

    if (firstHalf === secondHalf && firstHalf.length > 0) {
      await db.update(schema.events)
        .set({ name: firstHalf })
        .where(eq(schema.events.id, event.id));
      console.log(`   Fixed: "${name}" → "${firstHalf}"`);
      fixed++;
    }
  }
  console.log(`   Fixed ${fixed} duplicated names\n`);

  console.log('✅ Cleanup complete!');

  await client.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Cleanup failed:', error);
  await client.end();
  process.exit(1);
}
