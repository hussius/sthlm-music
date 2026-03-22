import { FastifyInstance } from 'fastify';
import { db } from '../../db/client.js';
import { sql } from 'drizzle-orm';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  });

  fastify.get('/status', async (request, reply) => {
    const result = await db.execute(sql`
      SELECT
        DATE(created_at AT TIME ZONE 'Europe/Stockholm') as last_crawl,
        COUNT(*) as event_count
      FROM events
      GROUP BY DATE(created_at AT TIME ZONE 'Europe/Stockholm')
      ORDER BY last_crawl DESC
      LIMIT 1
    `);
    const row = (result as any)[0];
    return {
      last_crawl: row?.last_crawl ?? null,
      event_count: row?.event_count ? Number(row.event_count) : 0,
    };
  });
}
