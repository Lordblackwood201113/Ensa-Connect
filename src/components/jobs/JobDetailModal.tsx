import { MapPin, Clock, ExternalLink, Building, Briefcase } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import type { Job } from '../../types';
import { formatDistanceToNow } from '../../lib/utils';
import { Link } from 'react-router-dom';

interface JobDetailModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
}

const contractColors: Record<string, string> = {
  'CDI': 'bg-green-100 text-green-700',
  'CDD': 'bg-blue-100 text-blue-700',
  'Stage': 'bg-purple-100 text-purple-700',
  'Alternance': 'bg-orange-100 text-orange-700',
  'Freelance': 'bg-pink-100 text-pink-700',
};

export function JobDetailModal({ job, isOpen, onClose }: JobDetailModalProps) {
  if (!job) return null;

  const timeAgo = formatDistanceToNow(new Date(job.created_at));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Détails de l'offre" size="lg">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
          <div className="flex items-start gap-4">
            {/* Company logo placeholder */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <Briefcase className="w-7 h-7 text-gray-400" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-brand-black mb-1">
                {job.title}
              </h2>
              <div className="flex items-center gap-2 text-base sm:text-lg text-gray-600 font-medium">
                <Building className="w-4 h-4 sm:w-5 sm:h-5" />
                {job.company}
              </div>
            </div>
          </div>
          <Badge className={`shrink-0 text-sm px-4 py-1.5 ${contractColors[job.contract_type] || 'bg-gray-100 text-gray-600'}`}>
            {job.contract_type}
          </Badge>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-2 rounded-lg text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400" />
            {job.location}
          </div>
          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-2 rounded-lg text-sm text-gray-600">
            <Clock className="w-4 h-4 text-gray-400" />
            Publié {timeAgo}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 mb-6">
          <section>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3">
              Description du poste
            </h3>
            <p className="whitespace-pre-line text-sm sm:text-base text-gray-600 leading-relaxed">
              {job.description}
            </p>
          </section>

          {job.requirements && (
            <section>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3">
                Prérequis
              </h3>
              <p className="whitespace-pre-line text-sm sm:text-base text-gray-600 leading-relaxed">
                {job.requirements}
              </p>
            </section>
          )}
        </div>

        {/* Footer - Poster info & Apply button */}
        <div className="bg-gray-50 rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link 
            to={`/member/${job.poster?.id}`} 
            onClick={onClose}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Avatar 
              src={job.poster?.avatar_url || undefined} 
              alt={job.poster?.last_name || 'Recruteur'} 
              size="md" 
            />
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">
                Publié par
              </p>
              <p className="font-bold text-brand-black">
                {job.poster?.first_name} {job.poster?.last_name}
              </p>
            </div>
          </Link>

          {job.apply_link && (
            <a 
              href={job.apply_link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <Button className="gap-2 w-full sm:w-auto">
                Postuler maintenant
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          )}
        </div>
      </div>
    </Modal>
  );
}
