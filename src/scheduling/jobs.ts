/**
 * BullMQ job queue definitions for scheduled crawls and cleanup.
 *
 * Features:
 * - Daily crawl jobs at 3-4 AM Stockholm time (staggered)
 * - Weekly cleanup job on Sundays at 4 AM
 * - Retry logic with exponential backoff
 * - Job retention for debugging
 */

import { Queue, QueueEvents } from 'bullmq';
import { config } from '../config/env.js';

// Create queue with Redis connection
export const crawlQueue = new Queue('event-crawls', {
  connection: {
    host: new URL(config.REDIS_URL).hostname,
    port: parseInt(new URL(config.REDIS_URL).port) || 6379
  },
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 30000  // Start with 30 seconds, exponential backoff
    },
    removeOnComplete: {
      age: 86400  // Keep completed jobs for 24 hours
    },
    removeOnFail: {
      age: 604800  // Keep failed jobs for 7 days
    }
  }
});

/**
 * Set up repeatable crawl jobs for all platforms.
 *
 * Jobs are staggered to avoid resource contention:
 * - Ticketmaster: 3:00 AM (largest dataset, needs most time)
 * - AXS: 3:15 AM
 * - DICE: 3:30 AM
 * - Venues: 4:00 AM (last, benefits from existing data for deduplication)
 */
export async function setupCrawlJobs(): Promise<void> {
  // Schedule Ticketmaster crawl at 3:00 AM Stockholm time
  await crawlQueue.add(
    'ticketmaster-crawl',
    { source: 'ticketmaster' },
    {
      repeat: {
        pattern: '0 3 * * *',
        tz: 'Europe/Stockholm'
      },
      jobId: 'ticketmaster-daily'
    }
  );

  // Schedule AXS crawl at 3:15 AM (stagger to avoid resource contention)
  await crawlQueue.add(
    'axs-crawl',
    { source: 'axs' },
    {
      repeat: {
        pattern: '15 3 * * *',
        tz: 'Europe/Stockholm'
      },
      jobId: 'axs-daily'
    }
  );

  // Schedule DICE crawl at 3:30 AM
  await crawlQueue.add(
    'dice-crawl',
    { source: 'dice' },
    {
      repeat: {
        pattern: '30 3 * * *',
        tz: 'Europe/Stockholm'
      },
      jobId: 'dice-daily'
    }
  );

  // Schedule venue crawls at 4:00 AM (after major platforms)
  await crawlQueue.add(
    'venues-crawl',
    { source: 'venues' },
    {
      repeat: {
        pattern: '0 4 * * *',
        tz: 'Europe/Stockholm'
      },
      jobId: 'venues-daily'
    }
  );

  console.log('Scheduled daily crawl jobs');
}

/**
 * Set up weekly cleanup job to maintain 12-month rolling window.
 *
 * Runs every Sunday at 4:00 AM Stockholm time.
 */
export async function setupCleanupJob(): Promise<void> {
  // Schedule cleanup every Sunday at 4:00 AM
  await crawlQueue.add(
    'cleanup',
    { task: 'remove-old-events' },
    {
      repeat: {
        pattern: '0 4 * * 0',
        tz: 'Europe/Stockholm'
      },
      jobId: 'cleanup-weekly'
    }
  );

  console.log('Scheduled weekly cleanup job');
}

/**
 * Initialize queue events for monitoring.
 *
 * QueueEvents provides real-time job status updates for monitoring.
 */
export const queueEvents = new QueueEvents('event-crawls', {
  connection: {
    host: new URL(config.REDIS_URL).hostname,
    port: parseInt(new URL(config.REDIS_URL).port) || 6379
  }
});
