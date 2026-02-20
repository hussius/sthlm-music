import { FastifyInstance } from 'fastify';
import { performance } from 'perf_hooks';

// Augment FastifyRequest to include startTime property
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}

/**
 * Response time tracking plugin
 *
 * Measures request duration and:
 * - Logs warning if request takes >200ms
 * - Adds X-Response-Time header to all responses
 *
 * Uses high-resolution performance timer for accurate measurements.
 */
export async function responseTimePlugin(fastify: FastifyInstance) {
  // Capture start time at beginning of request
  fastify.addHook('onRequest', async (request, reply) => {
    request.startTime = performance.now();
  });

  // Calculate and log duration after response sent
  fastify.addHook('onResponse', async (request, reply) => {
    if (request.startTime === undefined) {
      return; // Skip if startTime not set
    }

    const duration = performance.now() - request.startTime;

    // Log slow requests (>200ms target)
    if (duration > 200) {
      fastify.log.warn({
        method: request.method,
        url: request.url,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: reply.statusCode
      }, 'Slow request detected');
    }

    // Add header for debugging
    reply.header('X-Response-Time', `${duration.toFixed(2)}ms`);
  });
}
