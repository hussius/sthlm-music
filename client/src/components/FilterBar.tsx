import { useRef, useState, useEffect } from 'react';
import { useFilterState } from '@/hooks/useFilterState';
import { useDebounce } from '@/hooks/useDebounce';

export function FilterBar() {
  const { filters, updateFilters } = useFilterState();

  // Separate input state for search fields (immediate updates, debounced API calls)
  const [artistInput, setArtistInput] = useState(filters.artistSearch || '');
  const [eventInput, setEventInput] = useState(filters.eventSearch || '');
  const debouncedArtist = useDebounce(artistInput, 300);
  const debouncedEvent = useDebounce(eventInput, 300);

  // Mount guards: skip first fire so mount doesn't trigger an API refetch
  const isArtistMounted = useRef(false);
  const isEventMounted = useRef(false);

  useEffect(() => {
    if (!isArtistMounted.current) { isArtistMounted.current = true; return; }
    updateFilters({ artistSearch: debouncedArtist });
  }, [debouncedArtist]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isEventMounted.current) { isEventMounted.current = true; return; }
    updateFilters({ eventSearch: debouncedEvent });
  }, [debouncedEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive current month from dateFrom filter
  const currentMonth = filters.dateFrom ? new Date(filters.dateFrom) : new Date();

  const monthLabel = currentMonth.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
  });

  const goToMonth = (offset: number) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    const from = new Date(d.getFullYear(), d.getMonth(), 1);
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    updateFilters({
      dateFrom: from.toISOString(),
      dateTo: to.toISOString(),
    });
  };

  const handleClearFilters = () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    updateFilters({
      genre: undefined,
      venue: undefined,
      dateFrom: from.toISOString(),
      dateTo: to.toISOString(),
      artistSearch: undefined,
      eventSearch: undefined,
      organizerSearch: undefined,
    });
    setArtistInput('');
    setEventInput('');
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-white border border-gray-200 rounded-lg lg:sticky lg:top-4">
      <h2 className="text-lg font-semibold text-gray-900">Filters</h2>

      {/* Month Navigator */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Month</label>
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => goToMonth(-1)}
            className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 font-medium"
            aria-label="Previous month"
          >
            ←
          </button>
          <span className="flex-1 text-center text-sm font-medium text-gray-900 capitalize">
            {monthLabel}
          </span>
          <button
            onClick={() => goToMonth(1)}
            className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 font-medium"
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>

      {/* Genre Filter */}
      <div className="flex flex-col gap-2">
        <label htmlFor="genre" className="text-sm font-medium text-gray-700">
          Genre
        </label>
        <select
          id="genre"
          value={filters.genre || ''}
          onChange={(e) => updateFilters({ genre: e.target.value || undefined })}
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
          onChange={(e) => updateFilters({ venue: e.target.value || undefined })}
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

      {/* Artist Search */}
      <div className="flex flex-col gap-2">
        <label htmlFor="artistSearch" className="text-sm font-medium text-gray-700">
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
        <label htmlFor="eventSearch" className="text-sm font-medium text-gray-700">
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

      {/* Organizer Filter */}
      <div className="flex flex-col gap-2">
        <label htmlFor="organizerSearch" className="text-sm font-medium text-gray-700">
          Organizer
        </label>
        <select
          id="organizerSearch"
          value={filters.organizerSearch || ''}
          onChange={(e) => updateFilters({ organizerSearch: e.target.value || undefined })}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Organizers</option>
          <option value="Klubb Död">Klubb Död</option>
        </select>
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
