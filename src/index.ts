import { config } from './config/env.js';
import { db } from './db/client.js';
import { sql } from 'drizzle-orm';
import { setupCrawlJobs, setupCleanupJob } from './scheduling/jobs.js';
import { createWorker } from './scheduling/processors.js';
import { monitorJobs } from './scheduling/monitoring.js';

/**
 * Stockholm Events Crawler - Entry Point
 *
 * Starts the complete automated crawling system:
 * - Validates configuration
 * - Tests database connectivity
 * - Sets up scheduled jobs (daily crawls, weekly cleanup)
 * - Starts worker to process jobs
 * - Enables monitoring and alerting
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

  try {
    console.log('Setting up scheduled jobs...');
    await setupCrawlJobs();
    await setupCleanupJob();
    console.log('✅ Scheduled jobs configured');
  } catch (error) {
    console.error('❌ Failed to set up scheduled jobs:', error);
    process.exit(1);
  }

  console.log('');

  try {
    console.log('Starting worker...');
    const worker = createWorker();
    console.log('✅ Worker started');

    console.log('');
    console.log('Starting job monitoring...');
    await monitorJobs();
    console.log('✅ Monitoring active');
  } catch (error) {
    console.error('❌ Failed to start worker/monitoring:', error);
    process.exit(1);
  }

  console.log('');
  console.log('🚀 Stockholm Events Crawler system running');
  console.log('   - Daily crawls scheduled for 3-4 AM Stockholm time');
  console.log('   - Weekly cleanup scheduled for Sundays at 4 AM');
  console.log('   - Worker processing jobs');
  console.log('   - Monitoring and alerting active');
}

main().catch((error) => {
  console.error('Fatal error during startup:', error);
  process.exit(1);
});
