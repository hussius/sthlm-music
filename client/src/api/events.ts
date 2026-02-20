/**
 * Events API functions.
 *
 * Provides type-safe wrappers around event-related API endpoints.
 */

import { apiClient } from './client';
import type { EventFilters, EventsResponse } from '../types/events';

/**
 * Fetch events from API with optional filters.
 *
 * @param filters - Event filter parameters (genre, date range, venue, search, pagination)
 * @returns Promise resolving to events response with pagination cursor
 */
export async function fetchEvents(
  filters: EventFilters = {}
): Promise<EventsResponse> {
  return apiClient<EventsResponse>('/api/events', filters as Record<string, unknown>);
}
