import { config } from './config/env.js';
import { db } from './db/client.js';
import { sql } from 'drizzle-orm';

/**
 * Stockholm Events Crawler - Entry Point
 *
 * This is a minimal startup script that validates configuration and tests
 * database connectivity. The actual crawler implementations will be added
 * in subsequent phases.
 */
async function main() {
  console.log('🎵 Stockholm Events Crawler initialized');
  console.log('');
  console.log('Configuration:');
  console.log(`  NODE_ENV: ${config.NODE_ENV}`);
  console.log(`  LOG_LEVEL: ${config.LOG_LEVEL}`);
  console.log(`  CRAWL_CONCURRENCY: ${config.CRAWL_CONCURRENCY}`);
  console.log('');

  try {
    console.log('Testing database connection...');
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  console.log('');
  console.log('Ready to accept crawler jobs');
}

main().catch((error) => {
  console.error('Fatal error during startup:', error);
  process.exit(1);
});
