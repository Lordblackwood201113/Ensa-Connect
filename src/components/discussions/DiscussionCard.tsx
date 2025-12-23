import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import type { Discussion } from '../../types';
import { MessageCircle, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from '../../lib/utils';

interface DiscussionCardProps {
  discussion: Discussion;
  onClick: () => void;
}

export function DiscussionCard({ discussion, onClick }: DiscussionCardProps) {
  const timeAgo = formatDistanceToNow(new Date(discussion.created_at));
  const repliesCount = discussion.replies_count || 0;

  return (
    <Card
      className="group p-4 sm:p-6 cursor-pointer hover:shadow-md hover:border-brand-lime/50 transition-all duration-200 active:scale-[0.99] touch-manipulation"
      onClick={onClick}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Avatar - Hidden on very small screens, show badge instead */}
        <Avatar
          src={discussion.author?.avatar_url || undefined}
          alt={discussion.author?.first_name || 'Auteur'}
          size="md"
          className="hidden xs:block shrink-0 w-10 h-10 sm:w-12 sm:h-12"
        />

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              {/* Status badge */}
              {discussion.is_closed ? (
                <Badge variant="success" className="flex items-center gap-1 text-[10px] sm:text-xs shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Résolu</span>
                </Badge>
              ) : (
                <Badge variant="neutral" className="flex items-center gap-1 text-[10px] sm:text-xs shrink-0">
                  <Clock className="w-3 h-3" />
                  <span className="hidden sm:inline">En attente</span>
                </Badge>
              )}

              {/* Replies count - Mobile compact */}
              <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{repliesCount}</span>
              </span>
            </div>

            {/* Time ago */}
            <span className="text-[10px] sm:text-xs text-gray-400 shrink-0">{timeAgo}</span>
          </div>

          {/* Title */}
          <h3 className="text-base sm:text-lg font-bold text-brand-black mb-1.5 sm:mb-2 line-clamp-2 leading-snug pr-6 group-hover:text-brand-lime transition-colors">
            {discussion.title}
          </h3>

          {/* Content preview */}
          <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 mb-2 sm:mb-3">
            {discussion.content}
          </p>

          {/* Author info - Mobile optimized */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Avatar
              src={discussion.author?.avatar_url || undefined}
              alt={discussion.author?.first_name || 'Auteur'}
              size="sm"
              className="xs:hidden w-5 h-5"
            />
            <span className="font-medium text-gray-600 truncate">
              {discussion.author?.first_name} {discussion.author?.last_name}
            </span>
            {discussion.author?.promotion && (
              <>
                <span className="hidden sm:inline">·</span>
                <span className="hidden sm:inline text-gray-400">{discussion.author.promotion}</span>
              </>
            )}
          </div>
        </div>

        {/* Arrow indicator */}
        <ChevronRight className="w-5 h-5 text-gray-300 shrink-0 self-center group-hover:text-brand-lime transition-colors" />
      </div>
    </Card>
  );
}
