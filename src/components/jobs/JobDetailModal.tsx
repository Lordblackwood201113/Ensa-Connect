import { MapPin, Clock, ExternalLink, Building } from 'lucide-react';
import { Briefcase, CalendarBlank, EnvelopeSimple, Warning } from '@phosphor-icons/react';
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

  // Calculate deadline info
  const getDeadlineInfo = () => {
    if (!job.application_deadline) return null;
    const deadline = new Date(job.application_deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const formattedDate = deadline.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    if (daysLeft < 0) return { text: `Expirée le ${formattedDate}`, urgent: false, expired: true };
    if (daysLeft === 0) return { text: `Expire aujourd'hui`, urgent: true, expired: false };
    if (daysLeft <= 3) return { text: `Expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''} (${formattedDate})`, urgent: true, expired: false };
    return { text: `Date limite: ${formattedDate}`, urgent: false, expired: false };
  };

  const deadlineInfo = getDeadlineInfo();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Détails de l'offre" size="lg">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
          <div className="flex items-start gap-4">
            {/* Company logo or placeholder */}
            {job.image_url ? (
              <img
                src={job.image_url}
                alt={job.company}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shrink-0 border border-gray-100"
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <Briefcase size={28} className="text-gray-400" />
              </div>
            )}
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
          {deadlineInfo && (
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${
              deadlineInfo.expired
                ? 'bg-gray-100 text-gray-500'
                : deadlineInfo.urgent
                  ? 'bg-red-50 text-red-600'
                  : 'bg-blue-50 text-blue-600'
            }`}>
              {deadlineInfo.urgent && !deadlineInfo.expired && <Warning size={16} weight="fill" />}
              <CalendarBlank size={16} weight="fill" />
              {deadlineInfo.text}
            </div>
          )}
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

        {/* Footer - Poster info & Apply options */}
        <div className="bg-gray-50 rounded-xl p-4 sm:p-6 space-y-4">
          {/* Apply options */}
          {(job.apply_link || job.application_email) && (
            <div className="flex flex-col sm:flex-row gap-3">
              {job.apply_link && (
                <a
                  href={job.apply_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button className="gap-2 w-full">
                    Postuler en ligne
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              )}
              {job.application_email && (
                <a
                  href={`mailto:${job.application_email}?subject=Candidature: ${encodeURIComponent(job.title)}`}
                  className="flex-1"
                >
                  <Button variant={job.apply_link ? 'outline' : 'primary'} className="gap-2 w-full">
                    <EnvelopeSimple size={18} weight="duotone" />
                    Envoyer un email
                  </Button>
                </a>
              )}
            </div>
          )}

          {/* Poster info */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
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
          </div>
        </div>
      </div>
    </Modal>
  );
}
