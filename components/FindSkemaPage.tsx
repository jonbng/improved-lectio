import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Clock, Star, Users, Search, GraduationCap, School, DoorOpen, Box, UsersRound, LayoutGrid } from 'lucide-react';
import { PersonCard } from './PersonCard';
import { getCachedProfile } from '../lib/profile-cache';
import {
  getStarredPeople,
  getRecentPeople,
  addRecentPerson,
  removeRecentPerson,
  toggleStarred,
  isPersonStarred,
  parsePersonInfo,
  getScheduleUrl,
  type StarredPerson,
  type RecentPerson,
} from '../lib/findskema-storage';

interface SearchItem {
  name: string;
  id: string;
  type: string;
}

type SearchType = 'elev' | 'laerer' | 'stamklasse' | 'lokale' | 'ressource' | 'hold' | 'gruppe' | 'all';

// Filter configuration with icons and labels
const FILTER_CONFIG = [
  { key: 'S', label: 'Elever', icon: Users, type: 'elev' },
  { key: 'T', label: 'Lærere', icon: GraduationCap, type: 'laerer' },
  { key: 'K', label: 'Klasser', icon: School, type: 'stamklasse' },
  { key: 'L', label: 'Lokaler', icon: DoorOpen, type: 'lokale' },
  { key: 'R', label: 'Ressourcer', icon: Box, type: 'ressource' },
  { key: 'H', label: 'Hold', icon: UsersRound, type: 'hold' },
  { key: 'G', label: 'Grupper', icon: LayoutGrid, type: 'gruppe' },
] as const;

// Map search type to prefix
const TYPE_TO_PREFIX: Record<string, string> = {
  elev: 'S',
  laerer: 'T',
  stamklasse: 'K',
  lokale: 'L',
  ressource: 'R',
  hold: 'H',
  gruppe: 'G',
};

interface FindSkemaPageProps {
  schoolId: string;
  searchType?: SearchType;
}

export function FindSkemaPage({ schoolId, searchType = 'all' }: FindSkemaPageProps) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starred, setStarred] = useState<StarredPerson[]>([]);
  const [recents, setRecents] = useState<RecentPerson[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize active filters based on searchType prop
  const getInitialFilters = (): Set<string> => {
    if (searchType === 'all') {
      return new Set(['S', 'T', 'K', 'L', 'R', 'H', 'G']);
    }
    const prefix = TYPE_TO_PREFIX[searchType];
    return prefix ? new Set([prefix]) : new Set(['S', 'T', 'K', 'L', 'R', 'H', 'G']);
  };

  const [activeFilters, setActiveFilters] = useState<Set<string>>(getInitialFilters);

  const userProfile = getCachedProfile();

  // Get placeholder text based on active filters
  const placeholderText = useMemo(() => {
    if (activeFilters.size === 7) {
      return 'Søg efter elever, lærere, klasser...';
    }
    const activeLabels = FILTER_CONFIG
      .filter(f => activeFilters.has(f.key))
      .map(f => f.label.toLowerCase());
    return `Søg efter ${activeLabels.join(', ')}...`;
  }, [activeFilters]);

  // Toggle a filter
  const toggleFilter = useCallback((key: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        // Don't allow removing the last filter
        if (next.size > 1) {
          next.delete(key);
        }
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Select only one filter
  const selectOnlyFilter = useCallback((key: string) => {
    setActiveFilters(new Set([key]));
  }, []);

  // Select all filters
  const selectAllFilters = useCallback(() => {
    setActiveFilters(new Set(['S', 'T', 'K', 'L', 'R', 'H', 'G']));
  }, []);

  // Load autocomplete data - always load ALL items
  useEffect(() => {
    async function loadData() {
      try {
        const year = new Date().getFullYear();

        // Try to find afdeling from page scripts
        const scripts = document.querySelectorAll('script');
        let afdelingId: string | null = null;

        for (const script of scripts) {
          const match = script.textContent?.match(/AvanceretSkema_(\d+)_/);
          if (match) {
            afdelingId = match[1];
            break;
          }
        }

        if (!afdelingId) {
          const advPage = await fetch(`${window.location.origin}/lectio/${schoolId}/FindSkemaAdv.aspx`);
          const html = await advPage.text();
          const match = html.match(/AvanceretSkema_(\d+)_/);
          if (match) {
            afdelingId = match[1];
          }
        }

        if (!afdelingId) {
          throw new Error('Could not find afdeling ID');
        }

        const response = await fetch(
          `${window.location.origin}/lectio/${schoolId}/cache/DropDown.aspx?type=AvanceretSkema&afdeling=${afdelingId}&subcache=${year}`
        );
        const data = await response.json();

        // Load ALL items - filtering happens in the UI
        const parsed: SearchItem[] = data.items
          .filter((item: any[]) => {
            const id = item[1];
            return id && typeof id === 'string';
          })
          .map((item: any[]) => ({
            name: item[0],
            id: item[1],
            type: item[1]?.charAt(0) || 'S',
          }));

        setItems(parsed);
        setLoading(false);
      } catch (err) {
        console.error('[FindSkemaPage] Failed to load data:', err);
        setError('Kunne ikke indlæse søgedata');
        setLoading(false);
      }
    }

    loadData();
  }, [schoolId]);

  // Load starred and recents from localStorage
  useEffect(() => {
    setStarred(getStarredPeople());
    setRecents(getRecentPeople());
  }, []);

  // Keyboard shortcut to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
        setQuery('');
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Normalize string by removing diacritics (accents) for search
  const normalizeString = (str: string) =>
    str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Filter items based on search query and active filters
  const filteredItems = useMemo(() => {
    if (query.length < 2) return [];
    const normalizedQuery = normalizeString(query);
    return items
      .filter(item => activeFilters.has(item.type) && normalizeString(item.name).includes(normalizedQuery))
      .slice(0, 30);
  }, [items, query, activeFilters]);

  // Get classmates (people in same class as user)
  const classmates = useMemo(() => {
    if (!userProfile?.className) return [];
    const userClass = userProfile.className.toLowerCase();

    return items.filter(item => {
      if (item.type !== 'S') return false;
      // Extract class from name: "Name (1x 05)" -> "1x"
      const match = item.name.match(/\((\d+[a-z])\s*\d*\)$/i);
      if (!match) return false;
      return match[1].toLowerCase() === userClass;
    });
  }, [items, userProfile?.className]);

  // Handle starring
  const handleStarToggle = useCallback((id: string) => {
    const searchItem = items.find(i => i.id === id);
    const recentItem = recents.find(r => r.id === id);
    const starredItem = starred.find(s => s.id === id);

    if (searchItem) {
      const { displayName, classCode } = parsePersonInfo(searchItem.name);
      toggleStarred({
        id,
        name: displayName,
        classCode,
        type: searchItem.type,
      });
    } else if (recentItem) {
      toggleStarred({
        id,
        name: recentItem.name,
        classCode: recentItem.classCode,
        type: recentItem.type,
      });
    } else if (starredItem) {
      toggleStarred({
        id,
        name: starredItem.name,
        classCode: starredItem.classCode,
        type: starredItem.type,
      });
    }
    setStarred(getStarredPeople());
  }, [items, recents, starred]);

  // Handle removing from recents
  const handleRemoveRecent = useCallback((id: string) => {
    removeRecentPerson(id);
    setRecents(getRecentPeople());
  }, []);

  // Handle card click (add to recents)
  const handleCardClick = useCallback((item: SearchItem) => {
    const { displayName, classCode } = parsePersonInfo(item.name);
    addRecentPerson({
      id: item.id,
      name: displayName,
      classCode,
      type: item.type,
      url: getScheduleUrl(item.id, schoolId),
    });
  }, [schoolId]);

  // Filter recents and starred based on active filters
  const filteredRecents = useMemo(() => {
    return recents.filter(r => activeFilters.has(r.type));
  }, [recents, activeFilters]);

  const filteredStarred = useMemo(() => {
    return starred.filter(s => activeFilters.has(s.type));
  }, [starred, activeFilters]);

  // Determine which sections to show
  const showSearchResults = query.length >= 2;
  const showRecents = !showSearchResults && filteredRecents.length > 0;
  const showStarred = !showSearchResults && filteredStarred.length > 0;
  const showClassmates = !showSearchResults && classmates.length > 0 && activeFilters.has('S');

  return (
    <div className="findskema-page pb-2">
      {/* Search Section */}
      <div className="findskema-search-container">
        <div className="findskema-search-wrapper">
          <Search className="findskema-search-icon" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
            placeholder={loading ? 'Indlæser...' : placeholderText}
            disabled={loading || !!error}
            className="findskema-search-input"
          />
          <div className="findskema-search-actions">
            {query ? (
              <button
                onClick={() => setQuery('')}
                className="findskema-clear-btn"
              >
                <X className="size-5" />
              </button>
            ) : (
              <kbd className="findskema-shortcut-hint">
                <span>⌘</span>K
              </kbd>
            )}
          </div>
        </div>
        {error && <p className="findskema-error">{error}</p>}
      </div>

      {/* Filter Pills */}
      <div className="findskema-filters">
        <button
          type="button"
          onClick={selectAllFilters}
          className={`findskema-filter-pill ${activeFilters.size === 7 ? 'is-active' : ''}`}
        >
          Alle
        </button>
        {FILTER_CONFIG.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={(e) => {
              if (e.shiftKey) {
                selectOnlyFilter(key);
              } else {
                toggleFilter(key);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              selectOnlyFilter(key);
            }}
            className={`findskema-filter-pill ${activeFilters.has(key) ? 'is-active' : ''}`}
            title={`Klik for at toggle, shift+klik eller højreklik for kun ${label.toLowerCase()}`}
          >
            <Icon className="size-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Search Results */}
      {showSearchResults && (
        <section className="findskema-section">
          <div className="findskema-section-header">
            <Search className="size-4" />
            <span>Søgeresultater ({filteredItems.length})</span>
          </div>
          {filteredItems.length > 0 ? (
            <div className="findskema-card-grid">
              {filteredItems.map(item => {
                const { displayName, classCode } = parsePersonInfo(item.name);
                return (
                  <PersonCard
                    key={item.id}
                    id={item.id}
                    name={displayName}
                    classCode={classCode}
                    type={item.type}
                    href={getScheduleUrl(item.id, schoolId)}
                    isStarred={isPersonStarred(item.id)}
                    onStarToggle={handleStarToggle}
                    onClick={() => handleCardClick(item)}
                    schoolId={schoolId}
                  />
                );
              })}
            </div>
          ) : (
            <p className="findskema-empty">Ingen resultater fundet</p>
          )}
        </section>
      )}

      {/* Recents Section */}
      {showRecents && (
        <section className="findskema-section">
          <div className="findskema-section-header">
            <Clock className="size-4" />
            <span>Seneste</span>
          </div>
          <div className="findskema-card-grid">
            {filteredRecents.map(recent => (
              <PersonCard
                key={recent.id}
                id={recent.id}
                name={recent.name}
                classCode={recent.classCode}
                type={recent.type}
                href={recent.url}
                isStarred={isPersonStarred(recent.id)}
                onStarToggle={handleStarToggle}
                onRemove={handleRemoveRecent}
                schoolId={schoolId}
              />
            ))}
          </div>
        </section>
      )}

      {/* Starred Section */}
      {showStarred && (
        <section className="findskema-section">
          <div className="findskema-section-header">
            <Star className="size-4" />
            <span>Favoritter</span>
          </div>
          <div className="findskema-card-grid">
            {filteredStarred.map(person => (
              <PersonCard
                key={person.id}
                id={person.id}
                name={person.name}
                classCode={person.classCode}
                type={person.type}
                href={getScheduleUrl(person.id, schoolId)}
                isStarred={true}
                onStarToggle={handleStarToggle}
                onClick={() => {
                  addRecentPerson({
                    id: person.id,
                    name: person.name,
                    classCode: person.classCode,
                    type: person.type,
                    url: getScheduleUrl(person.id, schoolId),
                  });
                }}
                schoolId={schoolId}
              />
            ))}
          </div>
        </section>
      )}

      {/* Classmates Section */}
      {showClassmates && (
        <section className="findskema-section">
          <div className="findskema-section-header">
            <Users className="size-4" />
            <span>Klassekammerater ({userProfile?.className})</span>
          </div>
          <div className="findskema-card-grid">
            {classmates.map(item => {
              const { displayName, classCode } = parsePersonInfo(item.name);
              return (
                <PersonCard
                  key={item.id}
                  id={item.id}
                  name={displayName}
                  classCode={classCode}
                  type={item.type}
                  href={getScheduleUrl(item.id, schoolId)}
                  isStarred={isPersonStarred(item.id)}
                  onStarToggle={handleStarToggle}
                  onClick={() => handleCardClick(item)}
                  schoolId={schoolId}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Loading State */}
      {loading && (
        <div className="findskema-loading">
          <div className="findskema-spinner" />
          <span>Indlæser data...</span>
        </div>
      )}
    </div>
  );
}
