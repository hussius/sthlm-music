/**
 * Ticketmaster Discovery API client with rate limiting.
 *
 * Features:
 * - 5 requests/second rate limit enforcement
 * - 5000 requests/day quota tracking
 * - Automatic daily quota reset at midnight UTC
 * - Graceful error handling (429, 500, etc.)
 * - Type-safe API response structures
 *
 * Rate limits (from Ticketmaster docs):
 * - Per-second: 5 requests/second
 * - Daily: 5000 requests/day
 *
 * Important: Rate limiting prevents quota exhaustion which would block
 * all crawling for 24 hours. The 200ms delay between requests ensures
 * we stay under the 5 req/sec limit.
 *
 * @see https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 */

/**
 * Ticketmaster API response structure
 */
export interface TicketmasterResponse {
  _embedded?: {
    events: any[];
  };
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

/**
 * Ticketmaster Discovery API client with automatic rate limiting.
 *
 * Usage:
 * ```typescript
 * const client = new TicketmasterClient(apiKey);
 * const response = await client.searchEvents({
 *   city: 'Stockholm',
 *   countryCode: 'SE',
 *   classificationName: 'Music'
 * });
 * ```
 */
export class TicketmasterClient {
  private readonly apiKey: string;
  private readonly baseURL = 'https://app.ticketmaster.com/discovery/v2';

  // Rate limiting state
  private lastRequestTime = 0;
  private dailyRequestCount = 0;
  private lastResetDate = new Date();

  constructor(apiKey: string) {
    if (!apiKey || apiKey === 'your_api_key_here') {
      throw new Error('Valid Ticketmaster API key required. Get one at https://developer.ticketmaster.com/');
    }
    this.apiKey = apiKey;
  }

  /**
   * Wait to respect rate limits before making a request.
   *
   * Enforces:
   * - Per-second limit: 5 requests/second = 200ms between requests
   * - Daily limit: 5000 requests/day (throws error if exceeded)
   *
   * Also resets daily counter at midnight UTC.
   */
  private async waitForRateLimit(): Promise<void> {
    // Reset daily quota if needed (new UTC day)
    this.resetDailyQuotaIfNeeded();

    // Check daily quota
    if (this.dailyRequestCount >= 5000) {
      throw new Error('Ticketmaster API daily quota exhausted (5000 requests). Quota resets at midnight UTC.');
    }

    // Per-second rate limit: max 5 requests per second = 200ms between requests
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < 200) {
      // Wait remaining time to reach 200ms
      const waitTime = 200 - elapsed;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
    this.dailyRequestCount++;

    // Warn at 90% quota usage
    if (this.dailyRequestCount === 4500) {
      console.warn('⚠️  Ticketmaster API quota warning: 4500/5000 requests used (90%). Consider pausing crawls.');
    }
  }

  /**
   * Reset daily quota counter at midnight UTC.
   */
  private resetDailyQuotaIfNeeded(): void {
    const now = new Date();

    // Check if we've crossed into a new UTC day
    if (now.getUTCDate() !== this.lastResetDate.getUTCDate() ||
        now.getUTCMonth() !== this.lastResetDate.getUTCMonth() ||
        now.getUTCFullYear() !== this.lastResetDate.getUTCFullYear()) {
      console.log(`✓ Ticketmaster API quota reset (new day). Previous usage: ${this.dailyRequestCount}/5000`);
      this.dailyRequestCount = 0;
      this.lastResetDate = now;
    }
  }

  /**
   * Search for events using Ticketmaster Discovery API.
   *
   * @param params - Search parameters
   * @returns API response with events and pagination info
   * @throws Error on API errors (401, 429, 500, etc.)
   */
  async searchEvents(params: {
    city?: string;
    stateCode?: string;
    countryCode?: string;
    startDateTime?: string;
    endDateTime?: string;
    classificationName?: string;
    page?: number;
    size?: number;
  }): Promise<TicketmasterResponse> {
    await this.waitForRateLimit();

    const queryParams = new URLSearchParams({
      apikey: this.apiKey,
      ...Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== undefined)
      ),
    });

    const url = `${this.baseURL}/events.json?${queryParams}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Ticketmaster API authentication failed. Check your API key.');
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. This should not happen with proper rate limiting.');
      }
      if (response.status >= 500) {
        throw new Error(`Ticketmaster API server error: ${response.status} ${response.statusText}`);
      }
      throw new Error(`Ticketmaster API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get details for a single event by ID.
   *
   * Used for:
   * - Fetching updated event details
   * - Checking if event still exists
   * - Getting full event data when search results are truncated
   *
   * @param eventId - Ticketmaster event ID
   * @returns Event details
   * @throws Error if event not found or API error
   */
  async getEventDetails(eventId: string): Promise<any> {
    await this.waitForRateLimit();

    const url = `${this.baseURL}/events/${eventId}.json?apikey=${this.apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Event not found: ${eventId}`);
      }
      if (response.status === 401) {
        throw new Error('Ticketmaster API authentication failed. Check your API key.');
      }
      throw new Error(`Failed to fetch event ${eventId}: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get current quota usage for monitoring.
   *
   * @returns Object with daily usage stats
   */
  getQuotaUsage(): { used: number; total: number; percentUsed: number } {
    return {
      used: this.dailyRequestCount,
      total: 5000,
      percentUsed: Math.round((this.dailyRequestCount / 5000) * 100),
    };
  }
}
