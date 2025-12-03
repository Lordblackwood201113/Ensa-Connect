import { MapPin, Clock, ExternalLink, Eye, Edit2, Trash2 } from 'lucide-react';
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

export function JobCard({ job, onViewDetail, onEdit, onDelete }: JobCardProps) {
  const { user } = useAuth();
  const timeAgo = formatDistanceToNow(new Date(job.created_at));
  const isOwner = user?.id === job.poster_id;

  return (
    <Card className="hover:shadow-md transition-shadow duration-200 flex flex-col h-full relative">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-brand-black line-clamp-1" title={job.title}>
            {job.title}
          </h3>
          <p className="text-gray-600 font-medium">{job.company}</p>
        </div>
        <Badge variant="neutral" className="shrink-0">
          {job.contract_type}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-6">
        <div className="flex items-center gap-1">
          <MapPin className="w-4 h-4" />
          {job.location}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {timeAgo}
        </div>
      </div>

      <div className="mb-6 flex-1">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
        <p className="text-sm text-gray-600 line-clamp-3">
          {job.description}
        </p>
      </div>

      <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Avatar 
            src={job.poster?.avatar_url || undefined} 
            alt={job.poster?.last_name || 'Recruteur'} 
            size="sm" 
            className="w-8 h-8"
          />
          <div className="text-xs">
            <p className="text-gray-500">Publié par</p>
            <p className="font-medium text-gray-900">
              {job.poster?.first_name} {job.poster?.last_name}
            </p>
          </div>
        </div>

        <div className="flex gap-1 items-center w-full sm:w-auto justify-end">
            {isOwner && (
                <>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-gray-500 hover:text-brand-black hover:bg-gray-100 px-2"
                        onClick={(e) => { e.stopPropagation(); onEdit && onEdit(job); }}
                    >
                        <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-gray-500 hover:text-red-600 hover:bg-red-50 px-2"
                        onClick={(e) => { e.stopPropagation(); onDelete && onDelete(job.id); }}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </>
            )}

            <Button 
                variant="ghost" 
                size="sm"
                className="text-gray-500 hover:text-brand-purple hover:bg-brand-purple/5 px-2"
                onClick={() => onViewDetail(job)}
            >
                <Eye className="w-5 h-5" />
            </Button>
            
            {job.apply_link && !isOwner && (
            <a href={job.apply_link} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="gap-2 ml-2">
                Postuler
                <ExternalLink className="w-4 h-4" />
                </Button>
            </a>
            )}
        </div>
      </div>
    </Card>
  );
}

