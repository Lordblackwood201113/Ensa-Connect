import { X, MapPin, Clock, ExternalLink, Building } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import type { Job } from '../../types';
import { formatDistanceToNow } from '../../lib/utils';

interface JobDetailModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
}

export function JobDetailModal({ job, isOpen, onClose }: JobDetailModalProps) {
  if (!isOpen || !job) return null;

  const timeAgo = formatDistanceToNow(new Date(job.created_at));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl relative">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center z-10">
            <h3 className="font-semibold text-gray-500">Détails de l'offre</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
            </button>
        </div>

        <div className="p-8">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-brand-black mb-2">{job.title}</h2>
                    <div className="flex items-center gap-2 text-lg text-gray-600 font-medium">
                        <Building className="w-5 h-5" />
                        {job.company}
                    </div>
                </div>
                <Badge variant="neutral" className="text-base px-4 py-1.5">
                    {job.contract_type}
                </Badge>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-8 pb-8 border-b border-gray-100">
                <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                    <MapPin className="w-4 h-4" />
                    {job.location}
                </div>
                <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                    <Clock className="w-4 h-4" />
                    Publié {timeAgo}
                </div>
            </div>

            <div className="space-y-8 mb-8">
                <section>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Description du poste</h3>
                    <p className="whitespace-pre-line text-gray-600 leading-relaxed">
                        {job.description}
                    </p>
                </section>

                {job.requirements && (
                    <section>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Prérequis</h3>
                        <p className="whitespace-pre-line text-gray-600 leading-relaxed">
                            {job.requirements}
                        </p>
                    </section>
                )}
            </div>

            <div className="bg-gray-50 rounded-xl p-6 flex items-center justify-between mt-8">
                <div className="flex items-center gap-3">
                    <Avatar 
                        src={job.poster?.avatar_url || undefined} 
                        alt={job.poster?.last_name || 'Recruteur'} 
                        size="md" 
                    />
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Publié par</p>
                        <p className="font-bold text-brand-black">
                            {job.poster?.first_name} {job.poster?.last_name}
                        </p>
                    </div>
                </div>

                {job.apply_link && (
                    <a href={job.apply_link} target="_blank" rel="noopener noreferrer">
                        <Button className="gap-2 shadow-lg shadow-brand-purple/20">
                            Postuler maintenant
                            <ExternalLink className="w-4 h-4" />
                        </Button>
                    </a>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}







