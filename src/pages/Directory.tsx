import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';
import { MemberCard } from '../components/directory/MemberCard';
import { DirectoryMap } from '../components/directory/DirectoryMap';
import { useSearchParams } from 'react-router-dom';
import {
  MagnifyingGlass,
  SquaresFour,
  MapTrifold,
  UsersThree,
  Funnel,
  X,
  CaretDown,
  GraduationCap,
  MapPin,
  Books,
  User,
  Buildings
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/ui/Avatar';
import { cn } from '../lib/utils';

export default function Directory() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlSearchTerm = searchParams.get('q') || '';

  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [localSearch, setLocalSearch] = useState(urlSearchTerm);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState({
    promotion: 'Tout',
    city: 'Tout',
    study_track: 'Tout'
  });
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const searchRef = useRef<HTMLDivElement>(null);

  // Sync local search with URL param
  useEffect(() => {
    setLocalSearch(urlSearchTerm);
  }, [urlSearchTerm]);

  // Click outside to close dropdowns and suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isOutsideDropdowns = Object.values(dropdownRefs.current).every(
        ref => !ref?.contains(event.target as Node)
      );
      if (isOutsideDropdowns) setOpenDropdown(null);

      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('promotion', null); 

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function for flexible search - matches all words in any order
  const matchesSearch = (searchQuery: string, member: Profile): boolean => {
    if (!searchQuery.trim()) return true;

    // Split search into individual words and filter empty strings
    const searchWords = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 0);

    // Build searchable text from member data
    const memberText = [
      member.first_name,
      member.last_name,
      member.company,
      member.job_title,
      member.city,
      member.promotion
    ].filter(Boolean).join(' ').toLowerCase();

    // All search words must be found somewhere in member text
    return searchWords.every(word => memberText.includes(word));
  };

  const filteredMembers = members.filter(member => {
    if (filters.promotion !== 'Tout' && member.promotion !== filters.promotion) return false;
    if (filters.city !== 'Tout' && member.city !== filters.city) return false;
    if (filters.study_track !== 'Tout' && member.study_track !== filters.study_track) return false;

    const searchQuery = localSearch || urlSearchTerm;
    return matchesSearch(searchQuery, member);
  });

  const activeFiltersCount = [filters.promotion, filters.city, filters.study_track].filter(f => f !== 'Tout').length;

  // Build filter options with "Tout" always first
  const promotions = ['Tout', ...[...new Set(members.map(m => m.promotion).filter((p): p is string => !!p))].sort().reverse()];
  const cities = ['Tout', ...[...new Set(members.map(m => m.city).filter((c): c is string => !!c))].sort()];
  const tracks = ['Tout', ...[...new Set(members.map(m => m.study_track).filter((t): t is string => !!t))].sort()];

  const clearFilters = () => {
    setFilters({ promotion: 'Tout', city: 'Tout', study_track: 'Tout' });
  };

  // Build autocomplete suggestions
  const getSuggestions = () => {
    if (!localSearch || localSearch.length < 2) return null;

    const term = localSearch.toLowerCase();
    const searchWords = term.split(/\s+/).filter(w => w.length > 0);

    // Helper to check if all words match in a text
    const matchesAllWords = (text: string) => {
      const lowerText = text.toLowerCase();
      return searchWords.every(word => lowerText.includes(word));
    };

    // Member suggestions (max 3) - flexible search on name
    const memberSuggestions = members
      .filter(m => {
        const fullName = `${m.first_name} ${m.last_name}`;
        return matchesAllWords(fullName);
      })
      .slice(0, 3);

    // Company suggestions (unique, max 3) - check if any word matches
    const companySuggestions = [...new Set(
      members
        .filter(m => m.company && searchWords.some(word => m.company!.toLowerCase().includes(word)))
        .map(m => m.company as string)
    )].slice(0, 3);

    // Promotion suggestions (max 3) - check if any word matches
    const promotionSuggestions = promotions
      .filter(p => p !== 'Tout' && searchWords.some(word => p.toLowerCase().includes(word)))
      .slice(0, 3);

    // City suggestions (max 3) - check if any word matches
    const citySuggestions = cities
      .filter(c => c !== 'Tout' && searchWords.some(word => c.toLowerCase().includes(word)))
      .slice(0, 3);

    // Track suggestions (max 3) - check if any word matches
    const trackSuggestions = tracks
      .filter(t => t !== 'Tout' && searchWords.some(word => t.toLowerCase().includes(word)))
      .slice(0, 3);

    const hasResults = memberSuggestions.length > 0 ||
      companySuggestions.length > 0 ||
      promotionSuggestions.length > 0 ||
      citySuggestions.length > 0 ||
      trackSuggestions.length > 0;

    if (!hasResults) return null;

    return {
      members: memberSuggestions,
      companies: companySuggestions,
      promotions: promotionSuggestions,
      cities: citySuggestions,
      tracks: trackSuggestions
    };
  };

  const suggestions = getSuggestions();

  const handleSuggestionClick = (type: string, value: string, memberId?: string) => {
    setShowSuggestions(false);

    if (type === 'member' && memberId) {
      navigate(`/member/${memberId}`);
    } else if (type === 'company') {
      setLocalSearch(value);
    } else if (type === 'promotion') {
      setFilters({ ...filters, promotion: value });
      setLocalSearch('');
    } else if (type === 'city') {
      setFilters({ ...filters, city: value });
      setLocalSearch('');
    } else if (type === 'track') {
      setFilters({ ...filters, study_track: value });
      setLocalSearch('');
    }
  };

  // Filter dropdown component
  const FilterDropdown = ({
    id,
    icon: Icon,
    label,
    value,
    options,
    onChange
  }: {
    id: string;
    icon: React.ElementType;
    label: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
  }) => {
    const isOpen = openDropdown === id;
    const isActive = value !== 'Tout';

    return (
      <div
        ref={(el) => { dropdownRefs.current[id] = el; }}
        className="relative shrink-0"
      >
        <button
          onClick={() => setOpenDropdown(isOpen ? null : id)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-2 rounded-full border transition-all text-xs sm:text-sm font-medium touch-manipulation whitespace-nowrap",
            isActive
              ? "bg-brand-black text-white border-brand-black"
              : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
          )}
        >
          <Icon size={14} weight={isActive ? "fill" : "regular"} className="shrink-0" />
          <span className="truncate max-w-[80px] sm:max-w-none">{isActive ? value : label}</span>
          <CaretDown
            size={12}
            weight="bold"
            className={cn("transition-transform shrink-0", isOpen && "rotate-180")}
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 sm:left-0 mt-2 w-48 sm:w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 max-h-60 overflow-auto">
            {options.map((option) => (
              <button
                key={option}
                onClick={() => {
                  onChange(option);
                  setOpenDropdown(null);
                }}
                className={cn(
                  "w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 text-sm transition-colors hover:bg-gray-50",
                  value === option
                    ? "text-brand-black font-semibold bg-gray-50"
                    : "text-gray-600"
                )}
              >
                {option === 'Tout' ? `Tous` : option}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-black">Annuaire</h1>
          <p className="text-sm text-gray-500 hidden sm:block">Trouvez et connectez-vous avec les alumni</p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-medium hidden sm:inline-flex">
            {filteredMembers.length} membre{filteredMembers.length !== 1 ? 's' : ''}
          </span>

          <div className="bg-white border border-gray-200 rounded-xl p-1 flex items-center">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-lg transition-all touch-manipulation",
                viewMode === 'grid' ? "bg-brand-black text-white" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <SquaresFour size={18} weight={viewMode === 'grid' ? "fill" : "regular"} />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={cn(
                "p-2 rounded-lg transition-all touch-manipulation",
                viewMode === 'map' ? "bg-brand-black text-white" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <MapTrifold size={18} weight={viewMode === 'map' ? "fill" : "regular"} />
            </button>
          </div>
        </div>
      </div>

      {/* Modern Search & Filters Bar - Hidden in map view */}
      {viewMode === 'grid' && (
      <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 space-y-3">
        {/* Search Input with Autocomplete */}
        <div className="relative" ref={searchRef}>
          <MagnifyingGlass
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10"
          />
          <input
            type="text"
            placeholder="Rechercher par nom, entreprise, promotion..."
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            className="w-full pl-12 pr-10 py-3 bg-gray-50 border-0 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:bg-white transition-all"
          />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch('');
                setShowSuggestions(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              <X size={16} weight="bold" />
            </button>
          )}

          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && suggestions && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 max-h-80 overflow-auto">
              {/* Member Suggestions */}
              {suggestions.members.length > 0 && (
                <div className="px-3 py-1.5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Membres</p>
                  {suggestions.members.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleSuggestionClick('member', '', member.id)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Avatar
                        src={member.avatar_url || undefined}
                        alt={member.first_name || 'User'}
                        size="sm"
                        className="w-8 h-8"
                      />
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium text-brand-black truncate">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {member.job_title || member.promotion || 'Membre'}
                        </p>
                      </div>
                      <User size={16} className="text-gray-400 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Company Suggestions */}
              {suggestions.companies.length > 0 && (
                <div className="px-3 py-1.5 border-t border-gray-50">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Entreprises</p>
                  {suggestions.companies.map((company) => (
                    <button
                      key={company}
                      onClick={() => handleSuggestionClick('company', company)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Buildings size={16} className="text-gray-500" />
                      </div>
                      <span className="flex-1 text-left text-sm text-brand-black truncate">{company}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Promotion Suggestions */}
              {suggestions.promotions.length > 0 && (
                <div className="px-3 py-1.5 border-t border-gray-50">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Promotions</p>
                  {suggestions.promotions.map((promo) => (
                    <button
                      key={promo}
                      onClick={() => handleSuggestionClick('promotion', promo)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                        <GraduationCap size={16} className="text-brand-primary" />
                      </div>
                      <span className="flex-1 text-left text-sm text-brand-black">{promo}</span>
                      <span className="text-xs text-gray-400">Filtrer</span>
                    </button>
                  ))}
                </div>
              )}

              {/* City Suggestions */}
              {suggestions.cities.length > 0 && (
                <div className="px-3 py-1.5 border-t border-gray-50">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Villes</p>
                  {suggestions.cities.map((city) => (
                    <button
                      key={city}
                      onClick={() => handleSuggestionClick('city', city)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <MapPin size={16} className="text-blue-500" />
                      </div>
                      <span className="flex-1 text-left text-sm text-brand-black">{city}</span>
                      <span className="text-xs text-gray-400">Filtrer</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Track Suggestions */}
              {suggestions.tracks.length > 0 && (
                <div className="px-3 py-1.5 border-t border-gray-50">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Filières</p>
                  {suggestions.tracks.map((track) => (
                    <button
                      key={track}
                      onClick={() => handleSuggestionClick('track', track)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                        <Books size={16} className="text-purple-500" />
                      </div>
                      <span className="flex-1 text-left text-sm text-brand-black">{track}</span>
                      <span className="text-xs text-gray-400">Filtrer</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filter Pills - Desktop */}
        <div className="hidden sm:flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-gray-500 mr-1">
            <Funnel size={16} />
            <span>Filtres:</span>
          </div>

          <FilterDropdown
            id="promotion"
            icon={GraduationCap}
            label="Promotion"
            value={filters.promotion}
            options={promotions}
            onChange={(v) => setFilters({ ...filters, promotion: v })}
          />

          <FilterDropdown
            id="city"
            icon={MapPin}
            label="Ville"
            value={filters.city}
            options={cities}
            onChange={(v) => setFilters({ ...filters, city: v })}
          />

          <FilterDropdown
            id="study_track"
            icon={Books}
            label="Filière"
            value={filters.study_track}
            options={tracks}
            onChange={(v) => setFilters({ ...filters, study_track: v })}
          />

          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-full transition-colors"
            >
              <X size={14} weight="bold" />
              <span>Effacer</span>
            </button>
          )}

          {/* Results count */}
          <div className="ml-auto text-sm text-gray-500">
            {filteredMembers.length} résultat{filteredMembers.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Filter Toggle - Mobile */}
        <div className="sm:hidden">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all touch-manipulation",
              showFilters || activeFiltersCount > 0
                ? "bg-brand-black text-white border-brand-black"
                : "bg-gray-50 text-gray-600 border-gray-200"
            )}
          >
            <Funnel size={16} weight={showFilters ? "fill" : "regular"} />
            <span className="text-sm font-medium">Filtres</span>
            {activeFiltersCount > 0 && (
              <span className={cn(
                "text-xs font-bold px-1.5 py-0.5 rounded-full",
                showFilters ? "bg-white text-brand-black" : "bg-brand-black text-white"
              )}>
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Mobile Filters Expanded */}
          {showFilters && (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <FilterDropdown
                  id="promotion"
                  icon={GraduationCap}
                  label="Promotion"
                  value={filters.promotion}
                  options={promotions}
                  onChange={(v) => setFilters({ ...filters, promotion: v })}
                />

                <FilterDropdown
                  id="city"
                  icon={MapPin}
                  label="Ville"
                  value={filters.city}
                  options={cities}
                  onChange={(v) => setFilters({ ...filters, city: v })}
                />

                <FilterDropdown
                  id="study_track"
                  icon={Books}
                  label="Filière"
                  value={filters.study_track}
                  options={tracks}
                  onChange={(v) => setFilters({ ...filters, study_track: v })}
                />
              </div>

              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <X size={14} weight="bold" />
                  <span>Effacer tous les filtres</span>
                </button>
              )}
            </div>
          )}

          {/* Mobile Results count */}
          <div className="mt-2 text-center text-sm text-gray-500">
            {filteredMembers.length} résultat{filteredMembers.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-2xl p-4 h-24 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredMembers.map((member) => (
                <MemberCard key={member.id} profile={member} />
              ))}
              {filteredMembers.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <UsersThree size={48} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Aucun membre trouvé</p>
                  <p className="text-sm text-gray-400">Essayez de modifier vos filtres</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden border border-gray-200">
              <DirectoryMap members={filteredMembers} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
