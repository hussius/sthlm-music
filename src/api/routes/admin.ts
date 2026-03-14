/**
 * Admin routes — protected by ADMIN_SECRET token.
 *
 * POST /admin/refresh
 *   Clears the DB and re-crawls all venues + Ticketmaster.
 *   Used by external cron services (e.g. cron-job.org) and for manual runs.
 *   Requires header: Authorization: Bearer <ADMIN_SECRET>
 */

import { FastifyInstance } from 'fastify';
import { spawn } from 'child_process';

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

    // Spawn with real-time log piping so output appears in Railway logs immediately
    const child = spawn('sh', ['-c', 'node clear-db.js && node crawl-all.js'], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk: Buffer) => process.stdout.write(chunk));
    child.stderr.on('data', (chunk: Buffer) => process.stderr.write(chunk));

    child.on('close', (code: number) => {
      fastify.log.info(`Admin refresh finished with exit code ${code}`);
    });
  });
}
