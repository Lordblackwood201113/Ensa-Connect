import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';
import { MemberCard } from '../components/directory/MemberCard';
import { Card } from '../components/ui/Card';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Promo() {
  const { profile: userProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('q') || '';

  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    city: 'Tout',
    study_track: 'Tout'
  });

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
        return fullName.includes(searchTerm.toLowerCase());
    }
    
    return true;
  });

  const cities = ['Tout', ...new Set(members.map(m => m.city).filter((c): c is string => !!c))].sort();
  const tracks = ['Tout', ...new Set(members.map(m => m.study_track).filter((t): t is string => !!t))].sort();

  if (!userProfile?.promotion) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Vous devez renseigner votre promotion pour accéder à cette page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
         <div>
            <h1 className="text-3xl font-bold text-brand-black">Ma Promotion</h1>
            <p className="text-gray-500 text-lg">{userProfile.promotion}</p>
         </div>
         <span className="text-gray-500 bg-gray-100 px-4 py-2 rounded-full text-sm font-medium">{filteredMembers.length} camarades</span>
      </div>

      <Card className="p-4">
        <div className="flex gap-4 overflow-x-auto pb-2 lg:pb-0">
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
      )}
    </div>
  );
}






