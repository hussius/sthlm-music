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
  const [organizerInput, setOrganizerInput] = useState(filters.organizerSearch || '');

  // Debounced values (triggers API after 300ms delay)
  const debouncedArtist = useDebounce(artistInput, 300);
  const debouncedEvent = useDebounce(eventInput, 300);
  const debouncedOrganizer = useDebounce(organizerInput, 300);

  // Set default date filter to show events from today to 3 months out
  useEffect(() => {
    // Only set default if NO filters are present at all
    const hasAnyFilter = filters.dateFrom || filters.dateTo || filters.genre || filters.venue;
    if (!hasAnyFilter) {
      const today = new Date();
      const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);

      updateFilters({
        dateFrom: today.toISOString(),
        dateTo: endOfYear.toISOString(),
      });
    }
  }, [filters, updateFilters]);

  // Sync debounced values to URL (triggers API refetch)
  useEffect(() => {
    updateFilters({ artistSearch: debouncedArtist });
  }, [debouncedArtist]);

  useEffect(() => {
    updateFilters({ eventSearch: debouncedEvent });
  }, [debouncedEvent]);

  useEffect(() => {
    updateFilters({ organizerSearch: debouncedOrganizer });
  }, [debouncedOrganizer]);

  const handleClearFilters = () => {
    // Reset to default date range (today to 3 months out)
    const today = new Date();
    const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);

    updateFilters({
      genre: undefined,
      venue: undefined,
      dateFrom: today.toISOString(),
      dateTo: endOfYear.toISOString(),
      artistSearch: undefined,
      eventSearch: undefined,
      organizerSearch: undefined,
    });

    // Reset input states
    setArtistInput('');
    setEventInput('');
    setOrganizerInput('');
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    if (!dateStr) {
      updateFilters({ dateFrom: undefined });
      return;
    }
    // Convert to ISO datetime - use UTC midnight to avoid timezone issues
    const isoDate = `${dateStr}T00:00:00.000Z`;
    updateFilters({ dateFrom: isoDate });
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    if (!dateStr) {
      updateFilters({ dateTo: undefined });
      return;
    }
    // Convert to ISO datetime - use UTC end of day
    const isoDate = `${dateStr}T23:59:59.999Z`;
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
          <option value="rock">Rock</option>
          <option value="pop">Pop</option>
          <option value="electronic">Electronic</option>
          <option value="jazz">Jazz</option>
          <option value="hip-hop">Hip-hop</option>
          <option value="metal">Metal</option>
          <option value="indie">Indie</option>
          <option value="folk">Folk</option>
          <option value="classical">Classical</option>
          <option value="world">World</option>
          <option value="other">Other</option>
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
          <option value="Debaser Nova">Debaser Nova</option>
          <option value="Debaser Strand">Debaser Strand</option>
          <option value="Slaktkyrkan">Slaktkyrkan</option>
          <option value="Hus 7">Hus 7</option>
          <option value="Fasching">Fasching</option>
          <option value="Nalen">Nalen</option>
          <option value="Fylkingen">Fylkingen</option>
          <option value="Pet Sounds">Pet Sounds</option>
          <option value="Fållan">Fållan</option>
          <option value="Södra Teatern">Södra Teatern</option>
          <option value="Rönnells Antikvariat">Rönnells Antikvariat</option>
          <option value="Banankompaniet">Banankompaniet</option>
          <option value="Berns">Berns</option>
          <option value="Cirkus">Cirkus</option>
          <option value="Stampen">Stampen</option>
          <option value="Gamla Enskede Bryggeri">Gamla Enskede Bryggeri</option>
          <option value="Reimersholme">Reimersholme</option>
          <option value="Rosettas">Rosettas</option>
          <option value="Slakthusetclub">Slakthusetclub</option>
          <option value="Gröna Lund">Gröna Lund</option>
          <option value="Geronimos FGT">Geronimos FGT</option>
          <option value="Konserthuset">Konserthuset</option>
          <option value="Fredagsmangel">Fredagsmangel</option>
          <option value="Göta Lejon">Göta Lejon</option>
          <option value="B-K">B-K</option>
          <option value="Rival">Rival</option>
          <option value="Under Bron">Under Bron</option>
        </select>
      </div>

      {/* Date Range */}
      <div className="flex flex-col gap-2">
        <label htmlFor="dateFrom" className="text-sm font-medium text-gray-700">
          Date From (click to open calendar)
        </label>
        <input
          id="dateFrom"
          type="date"
          value={filters.dateFrom ? filters.dateFrom.split('T')[0] : new Date().toISOString().split('T')[0]}
          onChange={handleDateFromChange}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="dateTo" className="text-sm font-medium text-gray-700">
          Date To (click to open calendar)
        </label>
        <input
          id="dateTo"
          type="date"
          value={filters.dateTo ? filters.dateTo.split('T')[0] : (() => {
            const now = new Date();
            return `${now.getFullYear()}-12-31`;
          })()}
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

      {/* Organizer Search */}
      <div className="flex flex-col gap-2">
        <label htmlFor="organizerSearch" className="text-sm font-medium text-gray-700">
          Search Organizer
        </label>
        <input
          id="organizerSearch"
          type="text"
          value={organizerInput}
          onChange={(e) => setOrganizerInput(e.target.value)}
          placeholder="Organizer name..."
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
