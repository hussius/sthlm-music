import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';
import { config } from '../config/env.js';

/**
 * PostgreSQL connection with connection pooling
 *
 * Configuration:
 * - max: 10 connections (suitable for crawler workload)
 * - idle_timeout: 30 seconds (release idle connections)
 * - connect_timeout: 10 seconds (fail fast on connection issues)
 */
const client = postgres(config.DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});

/**
 * Drizzle ORM instance with schema
 *
 * Usage:
 * ```ts
 * import { db } from './db/client.js';
 * import { events } from './db/schema.js';
 *
 * // Query events
 * const results = await db.select().from(events).where(...);
 *
 * // Insert event
 * await db.insert(events).values({ ... });
 * ```
 */
export const db = drizzle(client, { schema });
