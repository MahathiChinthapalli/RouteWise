import { useState, useEffect } from 'react';
import { searchPlaces, getCurrentLocation, reverseGeocode } from '../services/api';
import type { Destination } from '../types';

interface LocationSearchProps {
  onSelectLocation: (destination: Destination) => void;
  placeholder?: string;
}

export default function LocationSearch({ onSelectLocation, placeholder = 'Search for a location...' }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Destination[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      const places = await searchPlaces(query);
      setResults(places);
      setIsSearching(false);
      setShowResults(true);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSelectResult = (destination: Destination) => {
    onSelectLocation(destination);
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  const handleUseCurrentLocation = async () => {
    setIsSearching(true);
    const coords = await getCurrentLocation();
    if (coords) {
      const destination = await reverseGeocode(coords);
      if (destination) {
        onSelectLocation(destination);
        setQuery('');
        setShowResults(false);
      }
    }
    setIsSearching(false);
  };

  return (
    <div className="location-search">
      <div className="search-input-container">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          placeholder={placeholder}
          className="search-input"
        />
        <button
          onClick={handleUseCurrentLocation}
          className="current-location-btn"
          title="Use current location"
          disabled={isSearching}
        >
          📍
        </button>
      </div>

      {showResults && (results.length > 0 || isSearching) && (
        <div className="search-results">
          {isSearching ? (
            <div className="search-loading">Searching...</div>
          ) : (
            results.map((result) => (
              <div
                key={result.id}
                className="search-result-item"
                onClick={() => handleSelectResult(result)}
              >
                <div className="result-name">{result.name}</div>
                <div className="result-address">{result.address}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
