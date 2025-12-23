import { useEffect, useState } from 'react';
import { Plus, Search, Briefcase, Filter, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Job } from '../types';
import { JobCard } from '../components/jobs/JobCard';
import { CreateJobModal } from '../components/jobs/CreateJobModal';
import { JobDetailModal } from '../components/jobs/JobDetailModal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobToEdit, setJobToEdit] = useState<Job | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [contractFilter, setContractFilter] = useState('Tout');
  const [showFilters, setShowFilters] = useState(false);

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

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase());
        
    const matchesContract = contractFilter === 'Tout' || job.contract_type === contractFilter;

    return matchesSearch && matchesContract;
  });

  const hasActiveFilter = contractFilter !== 'Tout';

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-black">Offres d'emploi</h1>
          <p className="text-sm text-gray-500 hidden sm:block">Trouvez votre prochaine opportunité</p>
        </div>
        
        {/* Desktop button */}
        <Button 
          onClick={() => { setJobToEdit(null); setIsCreateModalOpen(true); }} 
          className="hidden sm:flex gap-2"
        >
          <Plus className="w-5 h-5" />
          Publier une offre
        </Button>
      </div>

      {/* Search & Filters */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input 
              placeholder="Rechercher un poste, une entreprise..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Mobile filter toggle */}
          <div className="flex items-center gap-2 sm:hidden">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border transition-all touch-manipulation",
                showFilters || hasActiveFilter
                  ? "bg-brand-black text-white border-brand-black"
                  : "bg-gray-50 text-gray-600 border-gray-200"
              )}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Type de contrat</span>
              {hasActiveFilter && (
                <span className="bg-white text-brand-black text-xs font-bold px-1.5 py-0.5 rounded-full">
                  1
                </span>
              )}
            </button>
            {hasActiveFilter && (
              <button
                onClick={() => setContractFilter('Tout')}
                className="p-2.5 rounded-xl border border-gray-200 text-gray-500 touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Contract filter - Always visible on desktop, collapsible on mobile */}
          <div className={cn(
            "sm:block overflow-hidden",
            showFilters ? "block" : "hidden"
          )}>
            <select
              className="w-full sm:w-auto bg-gray-50 border border-gray-200 rounded-xl min-h-[48px] py-3 sm:py-2 px-3 sm:px-4 focus:outline-none focus:ring-2 focus:ring-brand-lime text-sm touch-manipulation text-[16px] appearance-none leading-tight"
              value={contractFilter}
              onChange={(e) => setContractFilter(e.target.value)}
            >
              <option value="Tout">Tous types de contrats</option>
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="Stage">Stage</option>
              <option value="Alternance">Alternance</option>
              <option value="Freelance">Freelance</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {filteredJobs.length} offre{filteredJobs.length !== 1 ? 's' : ''}
        </span>
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
          <p className="text-sm text-gray-400 mb-4">
            {searchTerm || hasActiveFilter 
              ? 'Essayez de modifier vos filtres'
              : 'Soyez le premier à publier une offre !'}
          </p>
          {!searchTerm && !hasActiveFilter && (
            <Button variant="outline" onClick={() => { setJobToEdit(null); setIsCreateModalOpen(true); }}>
              Publier une offre
            </Button>
          )}
        </div>
      )}

      {/* Floating Action Button - Mobile only */}
      <button
        onClick={() => { setJobToEdit(null); setIsCreateModalOpen(true); }}
        className="sm:hidden fixed bottom-6 right-4 w-14 h-14 bg-brand-black text-white rounded-full shadow-lg flex items-center justify-center z-30 active:scale-95 transition-transform touch-manipulation"
      >
        <Plus className="w-6 h-6" />
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
