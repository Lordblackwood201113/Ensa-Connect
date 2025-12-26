import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';
import { MemberCard } from '../components/directory/MemberCard';
import { DirectoryMap } from '../components/directory/DirectoryMap';
import { Card } from '../components/ui/Card';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, Map, Users, Filter, X } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Directory() {
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('q') || '';

  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    promotion: 'Tout',
    city: 'Tout',
    study_track: 'Tout'
  });

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

  const filteredMembers = members.filter(member => {
    if (filters.promotion !== 'Tout' && member.promotion !== filters.promotion) return false;
    if (filters.city !== 'Tout' && member.city !== filters.city) return false;
    if (filters.study_track !== 'Tout' && member.study_track !== filters.study_track) return false;
    
    if (searchTerm) {
      const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
      const company = (member.company || '').toLowerCase();
      const term = searchTerm.toLowerCase();
      return fullName.includes(term) || company.includes(term);
    }
    
    return true;
  });

  const activeFiltersCount = [filters.promotion, filters.city, filters.study_track].filter(f => f !== 'Tout').length;

  const promotions = ['Tout', ...new Set(members.map(m => m.promotion).filter((p): p is string => !!p))].sort().reverse();
  const cities = ['Tout', ...new Set(members.map(m => m.city).filter((c): c is string => !!c))].sort();
  const tracks = ['Tout', ...new Set(members.map(m => m.study_track).filter((t): t is string => !!t))].sort();

  const clearFilters = () => {
    setFilters({ promotion: 'Tout', city: 'Tout', study_track: 'Tout' });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Mobile optimized */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-black">Annuaire</h1>
            <p className="text-sm text-gray-500 hidden sm:block">Trouvez et connectez-vous avec les alumni</p>
          </div>
          
          {/* View mode toggle & count */}
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-medium">
              {filteredMembers.length} membre{filteredMembers.length !== 1 ? 's' : ''}
            </span>
            
            <div className="bg-white border border-gray-200 rounded-lg p-0.5 flex items-center">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 rounded-md transition-all touch-manipulation",
                  viewMode === 'grid' ? "bg-brand-black text-white" : "text-gray-400"
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={cn(
                  "p-2 rounded-md transition-all touch-manipulation",
                  viewMode === 'map' ? "bg-brand-black text-white" : "text-gray-400"
                )}
              >
                <Map className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Filter Toggle */}
        <div className="flex items-center gap-2 sm:hidden">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border transition-all touch-manipulation",
              showFilters || activeFiltersCount > 0
                ? "bg-brand-black text-white border-brand-black"
                : "bg-white text-gray-600 border-gray-200"
            )}
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filtres</span>
            {activeFiltersCount > 0 && (
              <span className="bg-white text-brand-black text-xs font-bold px-1.5 py-0.5 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>
          
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="p-2.5 rounded-xl border border-gray-200 text-gray-500 touch-manipulation"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filters - Collapsible on mobile */}
      <Card className={cn(
        "p-3 sm:p-4 transition-all overflow-hidden",
        showFilters ? "block" : "hidden sm:block"
      )}>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-start">
          <select
            className="w-full sm:flex-1 bg-gray-50 border border-gray-200 rounded-xl min-h-[48px] py-3 sm:py-2 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm touch-manipulation text-[16px] appearance-none leading-tight"
            value={filters.promotion}
            onChange={(e) => setFilters({...filters, promotion: e.target.value})}
          >
            <option value="Tout">Toutes promos</option>
            {promotions.map(p => p !== 'Tout' && <option key={p} value={p}>{p}</option>)}
          </select>

          <select
            className="w-full sm:flex-1 bg-gray-50 border border-gray-200 rounded-xl min-h-[48px] py-3 sm:py-2 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm touch-manipulation text-[16px] appearance-none leading-tight"
            value={filters.city}
            onChange={(e) => setFilters({...filters, city: e.target.value})}
          >
            <option value="Tout">Toutes villes</option>
            {cities.map(c => c !== 'Tout' && <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            className="w-full sm:flex-1 bg-gray-50 border border-gray-200 rounded-xl min-h-[48px] py-3 sm:py-2 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm touch-manipulation text-[16px] appearance-none leading-tight"
            value={filters.study_track}
            onChange={(e) => setFilters({...filters, study_track: e.target.value})}
          >
            <option value="Tout">Toutes filières</option>
            {tracks.map(t => t !== 'Tout' && <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </Card>

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
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
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
