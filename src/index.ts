import { buildServer } from './server.js';
import { db } from './db/client.js';

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
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error during startup:', error);
  process.exit(1);
});
