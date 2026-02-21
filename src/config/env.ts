import { z } from 'zod';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local file
dotenv.config({ path: '.env.local' });

/**
 * Environment variable schema with validation
 *
 * All required variables MUST be present and valid for the application to start.
 * Invalid configuration causes immediate failure with clear error messages.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL URL'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid Redis URL').default('redis://localhost:6379'),
  TICKETMASTER_API_KEY: z.string().min(1, 'TICKETMASTER_API_KEY is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  CRAWL_CONCURRENCY: z.coerce.number().min(1).max(10).default(5),
});

/**
 * Validate environment variables and return typed configuration
 *
 * @throws {Error} Exits process with code 1 if validation fails
 */
export function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Environment validation failed:');
    console.error('');

    result.error.issues.forEach((issue) => {
      console.error(`  • ${issue.path.join('.')}: ${issue.message}`);
    });

    console.error('');
    console.error('Please check your .env file and ensure all required variables are set.');
    console.error('See .env.example for reference.');

    process.exit(1);
  }

  return result.data;
}

/**
 * Validated configuration object
 *
 * Safe to use throughout the application - all values are guaranteed to be valid.
 */
export const config = validateEnv();
