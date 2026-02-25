import { useState, useEffect, useRef, useCallback } from 'react';

interface CityEntry {
  city: string;
  city_ascii: string;
  admin_name: string;
  country: string;
}

interface CityAutocompleteProps {
  value: string;
  province: string;
  country: string;
  onCityChange: (city: string, province: string, country: string) => void;
  error?: string;
  label?: string;
}

// Cache cities data on window to avoid repeated fetches
const CITIES_CACHE_KEY = '__ifw_cities_cache__';

function getCachedCities(): CityEntry[] | null {
  return (window as unknown as Record<string, CityEntry[]>)[CITIES_CACHE_KEY] ?? null;
}

function setCachedCities(data: CityEntry[]): void {
  (window as unknown as Record<string, CityEntry[]>)[CITIES_CACHE_KEY] = data;
}

export function CityAutocomplete({
  value,
  province,
  country,
  onCityChange,
  error,
  label = 'City',
}: CityAutocompleteProps) {
  const [allCities, setAllCities] = useState<CityEntry[]>([]);
  const [citySearchResults, setCitySearchResults] = useState<CityEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load cities data
  useEffect(() => {
    const cached = getCachedCities();
    if (cached) {
      setAllCities(cached);
      return;
    }

    fetch('/cities.json')
      .then((res) => res.json())
      .then((data: CityEntry[]) => {
        setCachedCities(data);
        setAllCities(data);
      })
      .catch(() => {
        // If cities.json fails to load, allow manual entry
        setIsManualMode(true);
      });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowCityDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  const handleSearch = useCallback(
    (query: string) => {
      onCityChange(query, province, country);

      if (isManualMode) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (query.length < 2) {
        setCitySearchResults([]);
        setShowCityDropdown(false);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      debounceRef.current = setTimeout(() => {
        const lowerQuery = query.toLowerCase();
        const results = allCities
          .filter((c) => c.city_ascii.toLowerCase().includes(lowerQuery))
          .slice(0, 10);
        setCitySearchResults(results);
        setShowCityDropdown(results.length > 0 || query.length >= 2);
        setIsSearching(false);
      }, 300);
    },
    [allCities, isManualMode, onCityChange, province, country],
  );

  const handleSelect = (city: CityEntry) => {
    onCityChange(city.city, city.admin_name, city.country);
    setShowCityDropdown(false);
    setCitySearchResults([]);
  };

  const enterManualMode = () => {
    setIsManualMode(true);
    setShowCityDropdown(false);
    setCitySearchResults([]);
  };

  // Manual mode: simple inputs
  if (isManualMode) {
    return (
      <div>
        <div className="epilogue-input-group">
          <label className="epilogue-label" htmlFor="city-manual">
            {label}
          </label>
          <input
            id="city-manual"
            type="text"
            className={`epilogue-input${error ? ' has-error' : ''}`}
            value={value}
            onChange={(e) => onCityChange(e.target.value, province, country)}
            placeholder="Enter your city"
          />
        </div>
        <div className="epilogue-input-group">
          <label className="epilogue-label" htmlFor="province-manual">
            Province / State
          </label>
          <input
            id="province-manual"
            type="text"
            className="epilogue-input"
            value={province}
            onChange={(e) => onCityChange(value, e.target.value, country)}
            placeholder="Enter province or state"
          />
        </div>
        <div className="epilogue-input-group">
          <label className="epilogue-label" htmlFor="country-manual">
            Country
          </label>
          <input
            id="country-manual"
            type="text"
            className="epilogue-input"
            value={country}
            onChange={(e) => onCityChange(value, province, e.target.value)}
            placeholder="Enter country"
          />
        </div>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  // Autocomplete mode
  return (
    <div ref={wrapperRef}>
      <div className="epilogue-autocomplete-wrapper">
        <label className="epilogue-label" htmlFor="city-search">
          {label}
        </label>
        <input
          id="city-search"
          type="text"
          className={`epilogue-input${error ? ' has-error' : ''}`}
          value={value}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            if (value.length >= 2 && citySearchResults.length > 0) {
              setShowCityDropdown(true);
            }
          }}
          placeholder="Start typing your city..."
          autoComplete="off"
        />
        {isSearching && <span className="epilogue-search-indicator">Searching...</span>}

        {showCityDropdown && (
          <div className="epilogue-dropdown">
            {citySearchResults.map((city, idx) => (
              <div
                key={`${city.city_ascii}-${city.admin_name}-${idx}`}
                className="epilogue-dropdown-item"
                onClick={() => handleSelect(city)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSelect(city);
                }}
                role="option"
                tabIndex={0}
                aria-selected={value === city.city && province === city.admin_name}
              >
                <span className="epilogue-city-name">{city.city}</span>
                <span className="epilogue-city-details">
                  {city.admin_name}, {city.country}
                </span>
              </div>
            ))}
            <div
              className="epilogue-dropdown-item"
              onClick={enterManualMode}
              onKeyDown={(e) => {
                if (e.key === 'Enter') enterManualMode();
              }}
              role="option"
              tabIndex={0}
              aria-selected={false}
              style={{ color: 'var(--color-brand-primary)', fontWeight: 600, cursor: 'pointer' }}
            >
              Can't find your city? Enter it manually
            </div>
          </div>
        )}
      </div>

      {province && !showCityDropdown && (
        <div style={{ marginTop: '1rem' }}>
          <div className="epilogue-input-group">
            <label className="epilogue-label" htmlFor="province-auto">
              Province / State
            </label>
            <input
              id="province-auto"
              type="text"
              className="epilogue-input epilogue-input-readonly"
              value={province}
              readOnly
              tabIndex={-1}
            />
          </div>
          <div className="epilogue-input-group">
            <label className="epilogue-label" htmlFor="country-auto">
              Country
            </label>
            <input
              id="country-auto"
              type="text"
              className="epilogue-input epilogue-input-readonly"
              value={country}
              readOnly
              tabIndex={-1}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
