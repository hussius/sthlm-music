/**
 * Events service - business logic layer for event operations.
 *
 * Responsibilities:
 * - Apply business rules and validation
 * - Call repository layer for data access
 * - Transform data for API layer
 */

import { eventsRepository } from '../../repositories/events.repository.js';
import type { EventFilters, EventsResponse } from '../../repositories/events.repository.js';

/**
 * Events service class.
 *
 * Handles business logic for event operations, delegates data access to repository.
 */
export class EventsService {
  /**
   * Find events by filter criteria with pagination.
   *
   * Business logic:
   * - Applies default limit (20) if not provided
   * - Validates limit bounds (1-100)
   * - Delegates to repository for data access
   *
   * @param filters - Filter and pagination parameters
   * @returns Paginated events with nextCursor
   * @throws Error if limit is out of bounds
   */
  async findEvents(filters: EventFilters): Promise<EventsResponse> {
    // Apply default limit
    const limit = filters.limit ?? 20;

    // Validate limit bounds
    if (limit < 1 || limit > 500) {
      throw new Error(`Invalid limit: ${limit}. Must be between 1 and 500.`);
    }

    // Call repository with validated filters
    return eventsRepository.findByFilters({
      ...filters,
      limit
    });
  }
}

/**
 * Singleton events service instance.
 *
 * Usage:
 * ```ts
 * import { eventsService } from './services/events.service.js';
 *
 * const result = await eventsService.findEvents({
 *   genre: 'rock',
 *   limit: 20
 * });
 * ```
 */
export const eventsService = new EventsService();
