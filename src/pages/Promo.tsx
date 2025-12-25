import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';
import { MemberCard } from '../components/directory/MemberCard';
import { Card } from '../components/ui/Card';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, Filter, X, GraduationCap, MessageCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { PromoGroupChat } from '../components/promo/PromoGroupChat';

export default function Promo() {
  const { profile: userProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('q') || '';
  const tabParam = searchParams.get('tab') || 'annuaire';

  const [activeTab, setActiveTab] = useState<'annuaire' | 'groupe'>(tabParam === 'groupe' ? 'groupe' : 'annuaire');
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    city: 'Tout',
    study_track: 'Tout'
  });

  // Sync tab with URL
  const handleTabChange = (tab: 'annuaire' | 'groupe') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (userProfile?.promotion) {
      fetchMembers();
    }
  }, [userProfile]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('promotion', userProfile?.promotion);

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(member => {
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

  const cities = ['Tout', ...new Set(members.map(m => m.city).filter((c): c is string => !!c))].sort();
  const tracks = ['Tout', ...new Set(members.map(m => m.study_track).filter((t): t is string => !!t))].sort();

  const activeFiltersCount = [filters.city, filters.study_track].filter(f => f !== 'Tout').length;

  const clearFilters = () => {
    setFilters({ city: 'Tout', study_track: 'Tout' });
  };

  if (!userProfile?.promotion) {
    return (
      <div className="text-center py-10">
        <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Promotion non renseignée</p>
        <p className="text-sm text-gray-400">Vous devez renseigner votre promotion pour accéder à cette page.</p>
      </div>
    );
  }

  return (
    <div className={cn(
      activeTab === 'groupe'
        ? "flex flex-col h-[calc(100dvh-64px)] sm:h-[calc(100dvh-80px)]"
        : "space-y-4 sm:space-y-6 pb-20 sm:pb-10"
    )}>
      {/* Header - Mobile optimized */}
      <div className={cn(
        "flex flex-col gap-3 shrink-0",
        activeTab === 'groupe' && "px-0"
      )}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-black">Ma Promotion</h1>
            <p className="text-sm sm:text-lg text-gray-500">{userProfile.promotion}</p>
          </div>

          {/* Count badge (only in annuaire tab) */}
          {activeTab === 'annuaire' && (
            <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-medium">
              {filteredMembers.length} camarade{filteredMembers.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => handleTabChange('annuaire')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all',
              activeTab === 'annuaire'
                ? 'bg-white text-brand-black shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Users className="w-4 h-4" />
            Annuaire
          </button>
          <button
            onClick={() => handleTabChange('groupe')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all',
              activeTab === 'groupe'
                ? 'bg-white text-brand-black shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <MessageCircle className="w-4 h-4" />
            Groupe
          </button>
        </div>

        {/* Mobile Filter Toggle (only in annuaire tab) */}
        {activeTab === 'annuaire' && (
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
        )}
      </div>

      {/* Content based on active tab */}
      {activeTab === 'annuaire' ? (
        <>
          {/* Filters - Collapsible on mobile */}
          <Card className={cn(
            "p-3 sm:p-4 transition-all overflow-hidden",
            showFilters ? "block" : "hidden sm:block"
          )}>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-start">
              <select
                className="w-full sm:flex-1 bg-gray-50 border border-gray-200 rounded-xl min-h-[48px] py-3 sm:py-2 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-brand-lime text-sm touch-manipulation text-[16px] appearance-none leading-tight"
                value={filters.city}
                onChange={(e) => setFilters({...filters, city: e.target.value})}
              >
                <option value="Tout">Toutes villes</option>
                {cities.map(c => c !== 'Tout' && <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                className="w-full sm:flex-1 bg-gray-50 border border-gray-200 rounded-xl min-h-[48px] py-3 sm:py-2 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-brand-lime text-sm touch-manipulation text-[16px] appearance-none leading-tight"
                value={filters.study_track}
                onChange={(e) => setFilters({...filters, study_track: e.target.value})}
              >
                <option value="Tout">Toutes filières</option>
                {tracks.map(t => t !== 'Tout' && <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </Card>

          {/* Members Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
          ) : filteredMembers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredMembers.map((member) => (
                <MemberCard key={member.id} profile={member} />
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-8 sm:p-10 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium mb-1">Aucun camarade trouvé</p>
              <p className="text-sm text-gray-400">
                {searchTerm || activeFiltersCount > 0
                  ? 'Essayez de modifier vos filtres'
                  : 'Votre promotion ne compte pas encore de membres'}
              </p>
            </div>
          )}
        </>
      ) : (
        /* Group Chat Tab - Full height chat experience */
        <div className="flex-1 min-h-0 overflow-hidden">
          <PromoGroupChat promotion={userProfile.promotion} />
        </div>
      )}
    </div>
  );
}
