import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

const client = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(client);

console.log('🔍 Finding duplicate events...\n');

try {
  // Find duplicates: same venue + same date (ignoring time)
  const duplicates = await db.execute(sql`
    SELECT
      venue,
      DATE(date) as event_date,
      name,
      COUNT(*) as count,
      ARRAY_AGG(id ORDER BY created_at DESC) as ids,
      ARRAY_AGG(date ORDER BY created_at DESC) as dates
    FROM events
    GROUP BY venue, DATE(date), name
    HAVING COUNT(*) > 1
    ORDER BY count DESC, venue, event_date
  `);

  console.log(`📊 Found ${duplicates.length} sets of duplicates\n`);

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found!');
    await client.end();
    process.exit(0);
  }

  let totalDeleted = 0;

  for (const dup of duplicates) {
    console.log(`\n📍 ${dup.venue} - ${dup.event_date}`);
    console.log(`   ${dup.name}`);
    console.log(`   ${dup.count} duplicates found`);

    // Keep the first ID (most recent), delete the rest
    const [keepId, ...deleteIds] = dup.ids;

    console.log(`   Keeping: ${keepId}`);
    console.log(`   Deleting: ${deleteIds.join(', ')}`);

    // Delete duplicates
    for (const id of deleteIds) {
      await db.execute(sql`DELETE FROM events WHERE id = ${id}`);
      totalDeleted++;
    }

    console.log(`   ✅ Deleted ${deleteIds.length} duplicates`);
  }

  console.log(`\n✅ Deduplication complete!`);
  console.log(`📊 Deleted ${totalDeleted} duplicate events`);
  console.log(`📊 Kept ${duplicates.length} unique events`);

  await client.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}
