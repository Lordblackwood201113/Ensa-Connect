import { MapPin, Clock, ExternalLink, Edit2, Trash2, Briefcase, ChevronRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import type { Job } from '../../types';
import { formatDistanceToNow } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

interface JobCardProps {
  job: Job;
  onViewDetail: (job: Job) => void;
  onEdit?: (job: Job) => void;
  onDelete?: (jobId: string) => void;
}

const contractColors: Record<string, string> = {
  'CDI': 'bg-green-100 text-green-700',
  'CDD': 'bg-blue-100 text-blue-700',
  'Stage': 'bg-purple-100 text-purple-700',
  'Alternance': 'bg-orange-100 text-orange-700',
  'Freelance': 'bg-pink-100 text-pink-700',
};

export function JobCard({ job, onViewDetail, onEdit, onDelete }: JobCardProps) {
  const { user } = useAuth();
  const timeAgo = formatDistanceToNow(new Date(job.created_at));
  const isOwner = user?.id === job.poster_id;

  return (
    <Card
      className="group p-4 sm:p-6 hover:shadow-md hover:border-brand-lime/50 transition-all duration-200 flex flex-col h-full relative active:scale-[0.98] touch-manipulation cursor-pointer"
      onClick={() => onViewDetail(job)}
    >
      {/* Header - Mobile optimized */}
      <div className="flex items-start gap-3 mb-3">
        {/* Company Logo Placeholder */}
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-brand-lime/10 transition-colors">
          <Briefcase className="w-6 h-6 text-gray-400 group-hover:text-brand-lime transition-colors" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-brand-black text-base sm:text-lg line-clamp-2 leading-tight group-hover:text-brand-lime transition-colors">
              {job.title}
            </h3>
            <ChevronRight className="w-5 h-5 text-gray-300 shrink-0 sm:hidden group-hover:text-brand-lime transition-colors" />
          </div>
          <p className="text-gray-600 font-medium text-sm truncate">{job.company}</p>
        </div>
      </div>

      {/* Meta info - Horizontal scroll on mobile */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        <Badge className={`shrink-0 text-[10px] sm:text-xs ${contractColors[job.contract_type] || 'bg-gray-100 text-gray-600'}`}>
          {job.contract_type}
        </Badge>
        <span className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
          <MapPin className="w-3 h-3" />
          <span className="truncate max-w-[100px]">{job.location}</span>
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
          <Clock className="w-3 h-3" />
          {timeAgo}
        </span>
      </div>

      {/* Description - 2 lines on mobile, 3 on desktop */}
      <p className="text-sm text-gray-600 line-clamp-2 sm:line-clamp-3 mb-4 flex-1">
        {job.description}
      </p>

      {/* Footer */}
      <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
        {/* Poster info */}
        <div className="flex items-center gap-2 min-w-0">
          <Avatar 
            src={job.poster?.avatar_url || undefined} 
            alt={job.poster?.last_name || 'Recruteur'} 
            size="sm" 
            className="w-7 h-7 sm:w-8 sm:h-8"
          />
          <div className="text-xs min-w-0">
            <p className="text-gray-500 hidden sm:block">Publié par</p>
            <p className="font-medium text-gray-700 truncate">
              {job.poster?.first_name} {job.poster?.last_name?.charAt(0)}.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {isOwner && (
            <>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-gray-400 hover:text-brand-black hover:bg-gray-100 p-2"
                onClick={() => onEdit && onEdit(job)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2"
                onClick={() => onDelete && onDelete(job.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
          
          {job.apply_link && !isOwner && (
            <a href={job.apply_link} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="gap-1.5 text-xs sm:text-sm h-8 sm:h-9">
                <span className="hidden sm:inline">Postuler</span>
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
