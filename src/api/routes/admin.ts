/**
 * Admin routes — protected by ADMIN_SECRET token.
 *
 * POST /admin/refresh
 *   Clears the DB and re-crawls all venues + Ticketmaster.
 *   Used by external cron services (e.g. cron-job.org) and for manual runs.
 *   Requires header: Authorization: Bearer <ADMIN_SECRET>
 */

import { FastifyInstance } from 'fastify';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.post('/admin/refresh', async (request, reply) => {
    const secret = process.env.ADMIN_SECRET;

    // Require ADMIN_SECRET to be configured
    if (!secret) {
      return reply.code(503).send({ error: 'ADMIN_SECRET not configured on server' });
    }

    // Validate bearer token
    const auth = request.headers.authorization || '';
    if (auth !== `Bearer ${secret}`) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Respond immediately — crawl runs in background
    reply.code(202).send({ status: 'refresh started', startedAt: new Date().toISOString() });

    // Run in background so HTTP response is not blocked
    execAsync('node clear-db.js && node crawl-all.js', {
      cwd: process.cwd(),
      timeout: 30 * 60 * 1000, // 30 min max
    })
      .then(({ stdout, stderr }) => {
        fastify.log.info('Admin refresh completed');
        if (stdout) fastify.log.info(stdout.slice(-500));
        if (stderr) fastify.log.warn(stderr.slice(-500));
      })
      .catch((err) => {
        fastify.log.error({ err }, 'Admin refresh failed');
      });
  });
}
