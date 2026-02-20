import { FastifyInstance } from 'fastify';

/**
 * Health check routes
 *
 * Provides basic system health status endpoint for monitoring and load balancers.
 */
export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  });
}
