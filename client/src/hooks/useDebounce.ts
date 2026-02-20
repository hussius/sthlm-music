import { useState, useEffect } from 'react';

/**
 * Debounce hook - delays value updates by specified milliseconds.
 *
 * Pattern: Immediate state updates (input value) separate from debounced state (API trigger).
 * Provides responsive UI without overwhelming API. 300-500ms delay is sweet spot for search UX.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced value that updates after delay period of inactivity
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
