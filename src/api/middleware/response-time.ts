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
  fastify.addHook('onRequest', async (request) => {
    request.startTime = performance.now();
  });

  // onSend fires before headers are written — correct hook for adding headers
  fastify.addHook('onSend', async (request, reply, payload) => {
    if (request.startTime === undefined) {
      return payload;
    }

    const duration = performance.now() - request.startTime;

    if (duration > 200) {
      fastify.log.warn({
        method: request.method,
        url: request.url,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: reply.statusCode
      }, 'Slow request detected');
    }

    reply.header('X-Response-Time', `${duration.toFixed(2)}ms`);
    return payload;
  });
}
