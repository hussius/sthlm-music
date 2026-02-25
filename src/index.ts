import { buildServer } from './server.js';
import { db } from './db/client.js';
import { setupCrawlJobs, setupCleanupJob } from './scheduling/jobs.js';
import { createWorker } from './scheduling/processors.js';

/**
 * Stockholm Events API - Entry Point
 *
 * Starts the Fastify API server:
 * - Builds configured Fastify instance
 * - Starts HTTP server on configured port
 * - Logs server status
 */
async function main() {
  try {
    // Build Fastify server with all plugins and routes
    const server = await buildServer();

    // Start server
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    await server.listen({ port, host: '0.0.0.0' });

    server.log.info(`Server listening at http://0.0.0.0:${port}`);

    // Start BullMQ worker and register repeating jobs
    // Wrapped in try/catch: Redis unavailability must NOT prevent API from starting
    try {
      const worker = createWorker();
      await setupCrawlJobs();
      await setupCleanupJob();
      server.log.info('Scheduling worker started, crawl jobs registered');
    } catch (error) {
      server.log.error(
        { error },
        'Scheduling worker failed to start — crawls will not run automatically'
      );
      // Do NOT rethrow — API should still serve requests even if Redis is down
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error during startup:', error);
  process.exit(1);
});
