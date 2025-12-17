import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';
import { MemberCard } from '../components/directory/MemberCard';
import { DirectoryMap } from '../components/directory/DirectoryMap';
import { Card } from '../components/ui/Card';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, Map } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Directory() {
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('q') || '';

  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
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

  const promotions = ['Tout', ...new Set(members.map(m => m.promotion).filter((p): p is string => !!p))].sort().reverse();
  const cities = ['Tout', ...new Set(members.map(m => m.city).filter((c): c is string => !!c))].sort();
  const tracks = ['Tout', ...new Set(members.map(m => m.study_track).filter((t): t is string => !!t))].sort();

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <h1 className="text-3xl font-bold text-brand-black">Annuaire des membres</h1>
         
         <div className="flex items-center gap-4">
            <span className="text-gray-500 bg-gray-100 px-4 py-2 rounded-full text-sm font-medium">{filteredMembers.length} membres</span>
            
            <div className="bg-white border border-gray-200 rounded-lg p-1 flex items-center gap-1">
                <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                        "p-2 rounded-md transition-all",
                        viewMode === 'grid' ? "bg-brand-black text-white shadow-sm" : "text-gray-500 hover:text-brand-black hover:bg-gray-50"
                    )}
                    title="Vue liste"
                >
                    <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setViewMode('map')}
                    className={cn(
                        "p-2 rounded-md transition-all",
                        viewMode === 'map' ? "bg-brand-black text-white shadow-sm" : "text-gray-500 hover:text-brand-black hover:bg-gray-50"
                    )}
                    title="Vue carte"
                >
                    <Map className="w-4 h-4" />
                </button>
            </div>
         </div>
      </div>

      {/* Barre de filtres (Recherche déplacée dans le header) */}
      <Card className="p-4">
        <div className="flex gap-4 overflow-x-auto pb-2 lg:pb-0">
            <select 
                className="bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-brand-purple text-sm"
                value={filters.promotion}
                onChange={(e) => setFilters({...filters, promotion: e.target.value})}
            >
                <option value="Tout">Toutes promos</option>
                {promotions.map(p => p !== 'Tout' && <option key={p} value={p}>{p}</option>)}
            </select>

            <select 
                className="bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-brand-purple text-sm"
                value={filters.city}
                onChange={(e) => setFilters({...filters, city: e.target.value})}
            >
                <option value="Tout">Toutes villes</option>
                {cities.map(c => c !== 'Tout' && <option key={c} value={c}>{c}</option>)}
            </select>

            <select 
                className="bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-brand-purple text-sm"
                value={filters.study_track}
                onChange={(e) => setFilters({...filters, study_track: e.target.value})}
            >
                <option value="Tout">Toutes filières</option>
                {tracks.map(t => t !== 'Tout' && <option key={t} value={t}>{t}</option>)}
            </select>
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-10">Chargement...</div>
      ) : (
        <>
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMembers.map((member) => (
                    <MemberCard key={member.id} profile={member} />
                ))}
                {filteredMembers.length === 0 && (
                    <div className="col-span-full text-center py-10 text-gray-500">
                        Aucun membre ne correspond à votre recherche.
                    </div>
                )}
                </div>
            ) : (
                <DirectoryMap members={filteredMembers} />
            )}
        </>
      )}
    </div>
  );
}

