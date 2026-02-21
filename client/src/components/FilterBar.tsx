import { useEffect, useState } from 'react';
import { useFilterState } from '@/hooks/useFilterState';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * FilterBar component with genre, venue, date range, and search filters.
 *
 * Pattern: Separate immediate input state (artistInput, eventInput) from debounced state.
 * Input feels instant, API calls are throttled. Genre/venue/date update immediately
 * (no debounce needed for dropdowns/date pickers).
 */
export function FilterBar() {
  const { filters, updateFilters } = useFilterState();

  // Separate input state for search fields (immediate updates)
  const [artistInput, setArtistInput] = useState(filters.artistSearch || '');
  const [eventInput, setEventInput] = useState(filters.eventSearch || '');

  // Debounced values (triggers API after 300ms delay)
  const debouncedArtist = useDebounce(artistInput, 300);
  const debouncedEvent = useDebounce(eventInput, 300);

  // Set default date range on mount if not already set
  useEffect(() => {
    if (!filters.dateFrom && !filters.dateTo) {
      const today = new Date();
      const threeMonthsLater = new Date(today);
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

      updateFilters({
        dateFrom: today.toISOString(),
        dateTo: threeMonthsLater.toISOString(),
      });
    }
  }, []); // Only run once on mount

  // Sync debounced values to URL (triggers API refetch)
  useEffect(() => {
    updateFilters({ artistSearch: debouncedArtist });
  }, [debouncedArtist]);

  useEffect(() => {
    updateFilters({ eventSearch: debouncedEvent });
  }, [debouncedEvent]);

  const handleClearFilters = () => {
    // Clear URL params
    updateFilters({
      genre: undefined,
      venue: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      artistSearch: undefined,
      eventSearch: undefined,
    });

    // Reset input states
    setArtistInput('');
    setEventInput('');
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    // Convert to ISO datetime (start of day)
    const isoDate = date ? `${date}T00:00:00` : undefined;
    updateFilters({ dateFrom: isoDate });
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    // Convert to ISO datetime (end of day)
    const isoDate = date ? `${date}T23:59:59` : undefined;
    updateFilters({ dateTo: isoDate });
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-white border border-gray-200 rounded-lg lg:sticky lg:top-4">
      {/* Title */}
      <h2 className="text-lg font-semibold text-gray-900">Filters</h2>

      {/* Genre Filter */}
      <div className="flex flex-col gap-2">
        <label htmlFor="genre" className="text-sm font-medium text-gray-700">
          Genre
        </label>
        <select
          id="genre"
          value={filters.genre || ''}
          onChange={(e) =>
            updateFilters({ genre: e.target.value || undefined })
          }
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Genres</option>
          <option value="Rock">Rock</option>
          <option value="Pop">Pop</option>
          <option value="Electronic">Electronic</option>
          <option value="Jazz">Jazz</option>
          <option value="Hip Hop">Hip Hop</option>
          <option value="Metal">Metal</option>
          <option value="Indie">Indie</option>
          <option value="Folk">Folk</option>
          <option value="Classical">Classical</option>
          <option value="World">World</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Venue Filter */}
      <div className="flex flex-col gap-2">
        <label htmlFor="venue" className="text-sm font-medium text-gray-700">
          Venue
        </label>
        <select
          id="venue"
          value={filters.venue || ''}
          onChange={(e) =>
            updateFilters({ venue: e.target.value || undefined })
          }
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Venues</option>
          <option value="Kollektivet Livet">Kollektivet Livet</option>
          <option value="Slaktkyrkan">Slaktkyrkan</option>
          <option value="Hus 7">Hus 7</option>
          <option value="Fasching">Fasching</option>
          <option value="Nalen">Nalen</option>
          <option value="Fylkingen">Fylkingen</option>
          <option value="Slakthuset">Slakthuset</option>
          <option value="Fållan">Fållan</option>
          <option value="Landet">Landet</option>
          <option value="Mosebacke">Mosebacke</option>
          <option value="Kägelbanan">Kägelbanan</option>
          <option value="Pet Sounds">Pet Sounds</option>
          <option value="Debaser">Debaser</option>
        </select>
      </div>

      {/* Date Range */}
      <div className="flex flex-col gap-2">
        <label htmlFor="dateFrom" className="text-sm font-medium text-gray-700">
          Date From
        </label>
        <input
          id="dateFrom"
          type="date"
          value={filters.dateFrom?.split('T')[0] || ''}
          onChange={handleDateFromChange}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="dateTo" className="text-sm font-medium text-gray-700">
          Date To
        </label>
        <input
          id="dateTo"
          type="date"
          value={filters.dateTo?.split('T')[0] || ''}
          onChange={handleDateToChange}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Artist Search */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="artistSearch"
          className="text-sm font-medium text-gray-700"
        >
          Search Artists
        </label>
        <input
          id="artistSearch"
          type="text"
          value={artistInput}
          onChange={(e) => setArtistInput(e.target.value)}
          placeholder="Artist name..."
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Event Search */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="eventSearch"
          className="text-sm font-medium text-gray-700"
        >
          Search Events
        </label>
        <input
          id="eventSearch"
          type="text"
          value={eventInput}
          onChange={(e) => setEventInput(e.target.value)}
          placeholder="Event name..."
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Clear Filters Button */}
      <button
        onClick={handleClearFilters}
        className="mt-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
      >
        Clear All Filters
      </button>
    </div>
  );
}
