import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Job } from '../types';
import { JobCard } from '../components/jobs/JobCard';
import { CreateJobModal } from '../components/jobs/CreateJobModal';
import { JobDetailModal } from '../components/jobs/JobDetailModal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobToEdit, setJobToEdit] = useState<Job | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [contractFilter, setContractFilter] = useState('Tout');

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

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-brand-black">Offres d'emploi</h1>
          <p className="text-gray-500">Trouvez votre prochaine opportunité ou recrutez des talents</p>
        </div>
        <Button onClick={() => { setJobToEdit(null); setIsCreateModalOpen(true); }} className="gap-2 shadow-lg hover:shadow-xl transition-shadow">
          <Plus className="w-5 h-5" />
          Publier une offre
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
         <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input 
                    placeholder="Rechercher un poste, une entreprise..." 
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <select 
                className="bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-brand-purple text-sm"
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
      </Card>

      {loading ? (
        <div className="text-center py-10">Chargement...</div>
      ) : filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <div className="bg-gray-50 rounded-2xl p-10 text-center">
            <p className="text-gray-500 mb-4">Aucune offre ne correspond à votre recherche.</p>
            {jobs.length === 0 && (
                <Button variant="outline" onClick={() => { setJobToEdit(null); setIsCreateModalOpen(true); }}>
                    Soyez le premier à publier une offre !
                </Button>
            )}
        </div>
      )}

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



