import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { healthRoutes } from './api/routes/health.js';

/**
 * Build and configure Fastify server
 *
 * Sets up:
 * - Logging (level from LOG_LEVEL env var)
 * - Security headers via @fastify/helmet
 * - CORS via @fastify/cors
 * - Zod validation for type-safe routes
 * - Health check endpoint
 *
 * @returns Configured Fastify instance ready to start
 */
export async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info'
    }
  }).withTypeProvider<ZodTypeProvider>();

  // Security headers
  await fastify.register(helmet);

  // CORS configuration
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  });

  // Zod validation integration
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // Register routes
  await fastify.register(healthRoutes);

  return fastify;
}
