import { useEffect, useState, useRef } from 'react';
import { Briefcase } from 'lucide-react';
import {
  Plus,
  MagnifyingGlass,
  X,
  Funnel,
  CaretDown,
  MapPin,
  Buildings,
  Briefcase as BriefcaseIcon,
  FileText,
  SortAscending
} from '@phosphor-icons/react';
import { supabase } from '../lib/supabase';
import type { Job } from '../types';
import { JobCard } from '../components/jobs/JobCard';
import { CreateJobModal } from '../components/jobs/CreateJobModal';
import { JobDetailModal } from '../components/jobs/JobDetailModal';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';

const contractTypes = ['Tout', 'CDI', 'CDD', 'Stage', 'Alternance', 'Freelance'];

const sortOptions = [
  { value: 'recent', label: 'Plus récentes' },
  { value: 'oldest', label: 'Plus anciennes' },
  { value: 'title_asc', label: 'Titre A → Z' },
  { value: 'title_desc', label: 'Titre Z → A' },
  { value: 'company_asc', label: 'Entreprise A → Z' },
  { value: 'company_desc', label: 'Entreprise Z → A' },
];

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobToEdit, setJobToEdit] = useState<Job | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState({
    contract_type: 'Tout',
    location: 'Tout'
  });
  const [sortBy, setSortBy] = useState('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const searchRef = useRef<HTMLDivElement>(null);

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
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          poster:profiles(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette offre ?')) return;

    try {
      const { error } = await supabase.from('jobs').delete().eq('id', jobId);
      if (error) throw error;
      fetchJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
      alert('Erreur lors de la suppression');
    }
  };

  // Helper function for flexible search
  const matchesSearch = (searchQuery: string, job: Job): boolean => {
    if (!searchQuery.trim()) return true;

    const searchWords = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const jobText = [
      job.title,
      job.company,
      job.location,
      job.description,
      job.contract_type
    ].filter(Boolean).join(' ').toLowerCase();

    return searchWords.every(word => jobText.includes(word));
  };

  const filteredJobs = jobs
    .filter(job => {
      if (filters.contract_type !== 'Tout' && job.contract_type !== filters.contract_type) return false;
      if (filters.location !== 'Tout' && job.location !== filters.location) return false;
      return matchesSearch(searchTerm, job);
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'title_asc':
          return a.title.localeCompare(b.title, 'fr');
        case 'title_desc':
          return b.title.localeCompare(a.title, 'fr');
        case 'company_asc':
          return a.company.localeCompare(b.company, 'fr');
        case 'company_desc':
          return b.company.localeCompare(a.company, 'fr');
        case 'recent':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const activeFiltersCount = [filters.contract_type, filters.location].filter(f => f !== 'Tout').length;

  // Build location options
  const locations = ['Tout', ...[...new Set(jobs.map(j => j.location).filter((l): l is string => !!l))].sort()];

  const clearFilters = () => {
    setFilters({ contract_type: 'Tout', location: 'Tout' });
  };

  // Build autocomplete suggestions
  const getSuggestions = () => {
    if (!searchTerm || searchTerm.length < 2) return null;

    const term = searchTerm.toLowerCase();
    const searchWords = term.split(/\s+/).filter(w => w.length > 0);

    // Job title suggestions (max 3)
    const titleSuggestions = [...new Set(
      jobs
        .filter(j => searchWords.some(word => j.title.toLowerCase().includes(word)))
        .map(j => j.title)
    )].slice(0, 3);

    // Company suggestions (max 3)
    const companySuggestions = [...new Set(
      jobs
        .filter(j => searchWords.some(word => j.company.toLowerCase().includes(word)))
        .map(j => j.company)
    )].slice(0, 3);

    // Location suggestions (max 3)
    const locationSuggestions = locations
      .filter(l => l !== 'Tout' && searchWords.some(word => l.toLowerCase().includes(word)))
      .slice(0, 3);

    const hasResults = titleSuggestions.length > 0 ||
      companySuggestions.length > 0 ||
      locationSuggestions.length > 0;

    if (!hasResults) return null;

    return {
      titles: titleSuggestions,
      companies: companySuggestions,
      locations: locationSuggestions
    };
  };

  const suggestions = getSuggestions();

  const handleSuggestionClick = (type: string, value: string) => {
    setShowSuggestions(false);

    if (type === 'title' || type === 'company') {
      setSearchTerm(value);
    } else if (type === 'location') {
      setFilters({ ...filters, location: value });
      setSearchTerm('');
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
          <div className="absolute top-full left-0 mt-2 w-48 sm:w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 max-h-60 overflow-auto">
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

  // Sort dropdown component
  const SortDropdown = () => {
    const isOpen = openDropdown === 'sort';
    const currentLabel = sortOptions.find(o => o.value === sortBy)?.label || 'Trier';

    return (
      <div
        ref={(el) => { dropdownRefs.current['sort'] = el; }}
        className="relative shrink-0"
      >
        <button
          onClick={() => setOpenDropdown(isOpen ? null : 'sort')}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-full border border-gray-200 bg-white text-gray-700 hover:border-gray-300 transition-all text-xs sm:text-sm font-medium touch-manipulation whitespace-nowrap"
        >
          <SortAscending size={14} className="shrink-0" />
          <span className="hidden sm:inline">{currentLabel}</span>
          <span className="sm:hidden">Trier</span>
          <CaretDown
            size={12}
            weight="bold"
            className={cn("transition-transform shrink-0", isOpen && "rotate-180")}
          />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 sm:left-0 mt-2 w-48 sm:w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setSortBy(option.value);
                  setOpenDropdown(null);
                }}
                className={cn(
                  "w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 text-sm transition-colors hover:bg-gray-50",
                  sortBy === option.value
                    ? "text-brand-black font-semibold bg-gray-50"
                    : "text-gray-600"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-black">Offres d'emploi</h1>
          <p className="text-sm text-gray-500 hidden sm:block">Trouvez votre prochaine opportunité</p>
        </div>

        {/* Desktop button */}
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-medium hidden sm:inline-flex">
            {filteredJobs.length} offre{filteredJobs.length !== 1 ? 's' : ''}
          </span>
          <Button
            onClick={() => { setJobToEdit(null); setIsCreateModalOpen(true); }}
            className="hidden sm:flex gap-2"
          >
            <Plus size={20} weight="bold" />
            Publier une offre
          </Button>
        </div>
      </div>

      {/* Modern Search & Filters Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 space-y-3">
        {/* Search Input with Autocomplete */}
        <div className="relative" ref={searchRef}>
          <MagnifyingGlass
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10"
          />
          <input
            type="text"
            placeholder="Rechercher par poste, entreprise, lieu..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            className="w-full pl-12 pr-10 py-3 bg-gray-50 border-0 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:bg-white transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
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
              {/* Title Suggestions */}
              {suggestions.titles.length > 0 && (
                <div className="px-3 py-1.5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Postes</p>
                  {suggestions.titles.map((title) => (
                    <button
                      key={title}
                      onClick={() => handleSuggestionClick('title', title)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                        <BriefcaseIcon size={16} className="text-brand-primary" />
                      </div>
                      <span className="flex-1 text-left text-sm text-brand-black truncate">{title}</span>
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

              {/* Location Suggestions */}
              {suggestions.locations.length > 0 && (
                <div className="px-3 py-1.5 border-t border-gray-50">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Lieux</p>
                  {suggestions.locations.map((location) => (
                    <button
                      key={location}
                      onClick={() => handleSuggestionClick('location', location)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <MapPin size={16} className="text-blue-500" />
                      </div>
                      <span className="flex-1 text-left text-sm text-brand-black">{location}</span>
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
            id="contract_type"
            icon={FileText}
            label="Type de contrat"
            value={filters.contract_type}
            options={contractTypes}
            onChange={(v) => setFilters({ ...filters, contract_type: v })}
          />

          <FilterDropdown
            id="location"
            icon={MapPin}
            label="Lieu"
            value={filters.location}
            options={locations}
            onChange={(v) => setFilters({ ...filters, location: v })}
          />

          <div className="h-5 w-px bg-gray-200 mx-1" />

          <SortDropdown />

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
            {filteredJobs.length} résultat{filteredJobs.length !== 1 ? 's' : ''}
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
                  id="contract_type"
                  icon={FileText}
                  label="Type de contrat"
                  value={filters.contract_type}
                  options={contractTypes}
                  onChange={(v) => setFilters({ ...filters, contract_type: v })}
                />

                <FilterDropdown
                  id="location"
                  icon={MapPin}
                  label="Lieu"
                  value={filters.location}
                  options={locations}
                  onChange={(v) => setFilters({ ...filters, location: v })}
                />

                <SortDropdown />
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
            {filteredJobs.length} résultat{filteredJobs.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-4 h-48 animate-pulse">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-14 h-14 bg-gray-200 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onViewDetail={(j) => setSelectedJob(j)}
              onEdit={(j) => { setJobToEdit(j); setIsCreateModalOpen(true); }}
              onDelete={handleDeleteJob}
            />
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-2xl p-8 sm:p-10 text-center">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium mb-1">Aucune offre trouvée</p>
          <p className="text-sm text-gray-400">
            {searchTerm || activeFiltersCount > 0
              ? 'Essayez de modifier vos filtres'
              : 'Soyez le premier à publier une offre !'}
          </p>
        </div>
      )}

      {/* Floating Action Button - Mobile only */}
      <button
        onClick={() => { setJobToEdit(null); setIsCreateModalOpen(true); }}
        className="sm:hidden fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-br from-brand-primary to-brand-primary/80 text-white rounded-2xl shadow-lg shadow-brand-primary/30 flex items-center justify-center z-30 active:scale-95 hover:shadow-xl hover:shadow-brand-primary/40 transition-all touch-manipulation"
      >
        <Plus size={28} weight="bold" />
      </button>

      {/* Modals */}
      <CreateJobModal
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); setJobToEdit(null); }}
        onSuccess={fetchJobs}
        jobToEdit={jobToEdit}
      />

      <JobDetailModal
        isOpen={!!selectedJob}
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
      />
    </div>
  );
}
