import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import type { Discussion } from '../../types';
import { MessageCircle, CheckCircle2, Clock } from 'lucide-react';
import { formatDistanceToNow } from '../../lib/utils';

interface DiscussionCardProps {
  discussion: Discussion;
  onClick: () => void;
}

export function DiscussionCard({ discussion, onClick }: DiscussionCardProps) {
  const timeAgo = formatDistanceToNow(new Date(discussion.created_at));

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <Avatar 
          src={discussion.author?.avatar_url || undefined} 
          alt={discussion.author?.first_name || 'Auteur'} 
          size="md" 
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {discussion.is_closed ? (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Résolu
              </Badge>
            ) : (
              <Badge variant="neutral" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                En attente
              </Badge>
            )}
          </div>
          
          <h3 className="text-lg font-bold text-brand-black mb-2 line-clamp-2">
            {discussion.title}
          </h3>
          
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">
            {discussion.content}
          </p>
          
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span className="font-medium text-gray-600">
                {discussion.author?.first_name} {discussion.author?.last_name}
              </span>
              <span>·</span>
              <span>{timeAgo}</span>
            </div>
            
            <div className="flex items-center gap-1 text-gray-500">
              <MessageCircle className="w-4 h-4" />
              <span>{discussion.replies_count || 0} réponse{(discussion.replies_count || 0) > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
