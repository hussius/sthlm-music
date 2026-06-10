import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './dist/db/schema.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

console.log('🗑️  Clearing database...');

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 8000; // 8 seconds — gives Neon time to wake up

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clearDatabase() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const client = postgres(DATABASE_URL, {
      max: 1,
      connect_timeout: 60, // 60 seconds — Neon cold starts can be slow
    });
    const db = drizzle(client, { schema });

    try {
      if (attempt > 1) {
        console.log(`🔄 Attempt ${attempt}/${MAX_ATTEMPTS}...`);
      }
      await db.delete(schema.events);
      console.log('✅ Database cleared successfully');
      await client.end();
      return;
    } catch (error) {
      await client.end().catch(() => {});
      const isTimeout =
        error?.code === 'CONNECT_TIMEOUT' ||
        error?.cause?.code === 'CONNECT_TIMEOUT' ||
        String(error?.message).includes('CONNECT_TIMEOUT') ||
        String(error?.cause?.message).includes('CONNECT_TIMEOUT');

      if (attempt < MAX_ATTEMPTS && isTimeout) {
        console.warn(
          `⚠️  Connection timed out (attempt ${attempt}/${MAX_ATTEMPTS}). Retrying in ${RETRY_DELAY_MS / 1000}s...`
        );
        await sleep(RETRY_DELAY_MS);
      } else {
        throw error;
      }
    }
  }
}

try {
  await clearDatabase();
  process.exit(0);
} catch (error) {
  console.error('❌ Failed to clear database after all attempts:', error);
  process.exit(1);
}
