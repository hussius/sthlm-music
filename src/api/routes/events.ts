/**
 * Events API routes.
 *
 * Defines all endpoints for event operations:
 * - GET /api/events - List events with filtering and pagination
 */

import type { FastifyInstance } from 'fastify';
import { EventFiltersSchema, EventsResponseSchema } from '../validators/events.schema.js';
import { eventsController } from '../controllers/events.controller.js';

/**
 * Events routes plugin.
 *
 * Registers event-related endpoints with Fastify.
 * Uses Zod schemas for automatic validation and type inference.
 *
 * @param fastify - Fastify instance
 */
export async function eventsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/events - List events with filtering and pagination
   *
   * Query parameters (all optional):
   * - genre: Filter by canonical genre
   * - dateFrom: Filter by date range start (ISO 8601)
   * - dateTo: Filter by date range end (ISO 8601)
   * - venue: Filter by exact venue name
   * - artistSearch: Search artist names (case-insensitive)
   * - eventSearch: Search event names (case-insensitive)
   * - cursor: Pagination cursor from previous response
   * - limit: Page size (1-100, default 20)
   *
   * Response:
   * - 200: { events: Event[], nextCursor: string | null }
   * - 400: Validation error
   * - 500: Internal server error
   */
  fastify.get('/api/events', {
    schema: {
      querystring: EventFiltersSchema,
      response: {
        200: EventsResponseSchema
      }
    }
  }, eventsController.getEvents.bind(eventsController));
}
