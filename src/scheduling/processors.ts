/**
 * BullMQ job processors for executing crawl and cleanup jobs.
 *
 * Features:
 * - Routes jobs to appropriate crawler functions
 * - Handles errors and retries
 * - Returns structured results for monitoring
 * - Worker with event handlers for logging
 */

import { Worker, Job } from 'bullmq';
import { config } from '../config/env.js';
import { crawlTicketmaster } from '../crawlers/ticketmaster.js';
import { crawlAXS } from '../crawlers/axs.js';
import { crawlDICE } from '../crawlers/dice.js';
import { crawlAllVenues } from '../crawlers/venues/index.js';
import { cleanupOldEvents } from './cleanup.js';

/**
 * Process crawl job by routing to appropriate crawler.
 *
 * @param job - BullMQ job with source data
 * @returns Structured result with success/failure counts
 * @throws Error if crawler fails (triggers retry)
 */
export async function processCrawlJob(job: Job): Promise<any> {
  const { source } = job.data;

  console.log(`Starting ${source} crawl job...`);

  try {
    let result;

    switch (source) {
      case 'ticketmaster':
        result = await crawlTicketmaster();
        break;

      case 'axs':
        result = await crawlAXS();
        break;

      case 'dice':
        result = await crawlDICE();
        break;

      case 'venues':
        result = await crawlAllVenues();
        break;

      default:
        throw new Error(`Unknown crawler source: ${source}`);
    }

    console.log(`${source} crawl completed:`, result);
    return {
      success: true,
      source,
      eventsCollected: result.success,
      failed: result.failed,
      completedAt: new Date().toISOString()
    };

  } catch (error: any) {
    console.error(`${source} crawl failed:`, error);
    throw error;  // Re-throw to trigger retry
  }
}

/**
 * Process cleanup job to maintain 12-month rolling window.
 *
 * @param job - BullMQ cleanup job
 * @returns Structured result with deletion counts
 * @throws Error if cleanup fails (triggers retry)
 */
export async function processCleanupJob(job: Job): Promise<any> {
  console.log('Starting cleanup job...');

  try {
    const result = await cleanupOldEvents();

    console.log('Cleanup completed:', result);
    return {
      success: true,
      eventsRemoved: result.deleted,
      completedAt: new Date().toISOString()
    };

  } catch (error: any) {
    console.error('Cleanup failed:', error);
    throw error;
  }
}

/**
 * Create BullMQ worker to process jobs.
 *
 * Worker configuration:
 * - Concurrency: 1 (process one job at a time to avoid overwhelming system)
 * - Connects to same Redis instance as queue
 * - Routes jobs based on job name
 * - Logs completion and failure events
 *
 * @returns BullMQ Worker instance
 */
export function createWorker() {
  const worker = new Worker(
    'event-crawls',
    async (job) => {
      if (job.name === 'cleanup') {
        return processCleanupJob(job);
      } else {
        return processCrawlJob(job);
      }
    },
    {
      connection: {
        host: new URL(config.REDIS_URL).hostname,
        port: parseInt(new URL(config.REDIS_URL).port) || 6379
      },
      concurrency: 1  // Process one job at a time
    }
  );

  // Event handlers
  worker.on('completed', (job) => {
    console.log(`Job ${job.id} (${job.name}) completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} (${job?.name}) failed after ${job?.attemptsMade} attempts:`, err);
  });

  return worker;
}
