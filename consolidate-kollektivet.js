import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

console.log('🔄 Consolidating Kollektivet Livet venues...\n');

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

try {
  // First, find events that would conflict (same venue + date after consolidation)
  console.log('🔍 Finding potential conflicts...\n');

  const conflicts = await db.execute(sql`
    WITH consolidated AS (
      SELECT
        id,
        name,
        CASE
          WHEN venue LIKE 'Kollektivet%' THEN 'Kollektivet Livet'
          ELSE venue
        END as new_venue,
        date,
        venue as old_venue,
        ROW_NUMBER() OVER (
          PARTITION BY
            CASE WHEN venue LIKE 'Kollektivet%' THEN 'Kollektivet Livet' ELSE venue END,
            date
          ORDER BY created_at DESC
        ) as row_num
      FROM events
      WHERE venue LIKE 'Kollektivet%'
    )
    SELECT id, name, old_venue, new_venue, date
    FROM consolidated
    WHERE row_num > 1
  `);

  const conflictList = conflicts.rows || conflicts || [];

  if (conflictList.length > 0) {
    console.log(`⚠️  Found ${conflictList.length} duplicate events that will be removed:\n`);
    conflictList.slice(0, 10).forEach(row => {
      const date = new Date(row.date).toISOString().split('T')[0];
      console.log(`  ${date} | ${row.old_venue} | ${row.name}`);
    });
    if (conflictList.length > 10) {
      console.log(`  ... and ${conflictList.length - 10} more`);
    }

    // Delete the conflicting events (keeping the most recent one per venue+date)
    console.log(`\n🗑️  Removing duplicate events...`);

    // Delete one by one to avoid array syntax issues
    let deleted = 0;
    for (const conflict of conflictList) {
      await db.execute(sql`
        DELETE FROM events WHERE id = ${conflict.id}
      `);
      deleted++;
    }
    console.log(`✅ Removed ${deleted} duplicate events\n`);
  } else {
    console.log('✅ No conflicts found\n');
  }

  // Now update the venue names
  const result = await db.execute(sql`
    UPDATE events
    SET venue = 'Kollektivet Livet'
    WHERE venue LIKE 'Kollektivet%'
    AND venue != 'Kollektivet Livet'
  `);

  console.log(`✅ Updated ${result.rowCount || 0} events to use consolidated venue name`);

  // Show updated venues
  const venues = await db.execute(sql`
    SELECT venue, COUNT(*) as count
    FROM events
    GROUP BY venue
    ORDER BY venue
  `);

  console.log('\n📊 Current venues in database:');
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
