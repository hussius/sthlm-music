/**
 * Events controller - HTTP request/response handling for events API.
 *
 * Responsibilities:
 * - Parse and validate HTTP requests
 * - Call service layer for business logic
 * - Format HTTP responses
 * - Handle errors and return appropriate status codes
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { eventsService } from '../services/events.service.js';
import type { EventFilters } from '../validators/events.schema.js';

/**
 * Events controller class.
 *
 * Handles HTTP concerns for events API endpoints.
 */
export class EventsController {
  /**
   * Handle GET /api/events request.
   *
   * Query parameters are validated by Fastify using EventFiltersSchema.
   * This method extracts filters, calls service, and returns response.
   *
   * @param request - Fastify request with validated query parameters
   * @param reply - Fastify reply object
   * @returns Paginated events response
   */
  async getEvents(
    request: FastifyRequest<{ Querystring: EventFilters }>,
    reply: FastifyReply
  ) {
    try {
      // Query parameters already validated by Fastify
      const filters = request.query;

      // Call service layer
      const result = await eventsService.findEvents(filters);

      // Return result (Fastify auto-serializes based on response schema)
      return reply.send(result);
    } catch (error) {
      // Log error for debugging
      request.log.error(error, 'Error fetching events');

      // Return 500 error
      return reply.status(500).send({
        error: 'Internal server error'
      });
    }
  }
}

/**
 * Singleton events controller instance.
 *
 * Usage:
 * ```ts
 * import { eventsController } from './controllers/events.controller.js';
 *
 * fastify.get('/api/events', eventsController.getEvents.bind(eventsController));
 * ```
 */
export const eventsController = new EventsController();
