/**
 * Generic API client for making HTTP requests.
 *
 * Features:
 * - Auto-detects base URL from environment or defaults to localhost:3001
 * - Builds query params from object, filtering out undefined/null values
 * - Throws error on non-ok responses with status information
 * - Returns typed JSON responses
 */

const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function apiClient<T>(
  endpoint: string,
  params?: Record<string, unknown>
): Promise<T> {
  // Build URL with query parameters
  const url = new URL(endpoint, baseUrl);

  if (params) {
    // Filter out undefined/null params and add to URLSearchParams
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}
