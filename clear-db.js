import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

console.log('🗑️  Clearing database...');

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

try {
  const result = await db.delete(schema.events);
  console.log('✅ Database cleared successfully');

  await client.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Failed to clear database:', error);
  await client.end();
  process.exit(1);
}
