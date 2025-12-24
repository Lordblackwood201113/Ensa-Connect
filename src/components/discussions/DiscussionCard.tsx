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
      className="group p-3 xs:p-3.5 sm:p-6 cursor-pointer hover:shadow-md hover:border-brand-lime/50 transition-all duration-200 active:scale-[0.98] active:bg-gray-50/50 touch-manipulation select-none w-full max-w-full overflow-hidden"
      onClick={onClick}
    >
      <div className="flex items-start gap-2 xs:gap-2.5 sm:gap-4 min-w-0">
        {/* Avatar - Hidden on very small screens */}
        <Avatar
          src={discussion.author?.avatar_url || undefined}
          alt={discussion.author?.first_name || 'Auteur'}
          size="md"
          className="hidden xs:block shrink-0 flex-shrink-0 w-8 h-8 sm:w-12 sm:h-12"
        />

        <div className="flex-1 min-w-0 overflow-hidden">
          {/* Header row - More compact on mobile */}
          <div className="flex items-center justify-between gap-1 xs:gap-1.5 mb-1 min-w-0">
            <div className="flex items-center gap-1 xs:gap-1.5 min-w-0">
              {/* Status badge - Icon only on very small screens */}
              {discussion.is_closed ? (
                <Badge variant="success" className="flex items-center gap-0.5 text-[9px] xs:text-[10px] shrink-0 flex-shrink-0 px-1 xs:px-1.5 py-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
                  <span className="hidden sm:inline">Résolu</span>
                </Badge>
              ) : (
                <Badge variant="neutral" className="flex items-center gap-0.5 text-[9px] xs:text-[10px] shrink-0 flex-shrink-0 px-1 xs:px-1.5 py-0.5">
                  <Clock className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
                  <span className="hidden sm:inline">En attente</span>
                </Badge>
              )}

              {/* Replies count */}
              <span className="flex items-center gap-0.5 text-[10px] xs:text-[11px] text-gray-400 shrink-0 flex-shrink-0">
                <MessageCircle className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
                <span>{repliesCount}</span>
              </span>
            </div>

            {/* Time ago */}
            <span className="text-[9px] xs:text-[10px] text-gray-400 shrink-0 flex-shrink-0 whitespace-nowrap">{timeAgo}</span>
          </div>

          {/* Title */}
          <h3 className="text-[14px] xs:text-[15px] sm:text-lg font-bold text-brand-black mb-0.5 xs:mb-1 sm:mb-2 line-clamp-2 leading-tight group-hover:text-brand-lime group-active:text-brand-lime transition-colors break-words">
            {discussion.title}
          </h3>

          {/* Content preview - Shorter on mobile */}
          <p className="text-[11px] xs:text-xs sm:text-sm text-gray-500 line-clamp-1 xs:line-clamp-2 mb-1 xs:mb-1.5 sm:mb-3 leading-relaxed break-words">
            {discussion.content}
          </p>

          {/* Author info - Mobile optimized */}
          <div className="flex items-center gap-1 xs:gap-1.5 text-[10px] xs:text-[11px] text-gray-500 min-w-0">
            <Avatar
              src={discussion.author?.avatar_url || undefined}
              alt={discussion.author?.first_name || 'Auteur'}
              size="sm"
              className="xs:hidden w-4 h-4 shrink-0 flex-shrink-0"
            />
            <span className="font-medium text-gray-600 truncate min-w-0">
              {discussion.author?.first_name} {discussion.author?.last_name}
            </span>
            {discussion.author?.promotion && (
              <>
                <span className="hidden sm:inline text-gray-300 shrink-0">·</span>
                <span className="hidden sm:inline text-gray-400 truncate min-w-0">{discussion.author.promotion}</span>
              </>
            )}
          </div>
        </div>

        {/* Arrow indicator - Hidden on mobile to save space */}
        <ChevronRight className="w-4 h-4 xs:w-5 xs:h-5 text-gray-300 shrink-0 flex-shrink-0 self-center group-hover:text-brand-lime group-active:text-brand-lime group-hover:translate-x-0.5 transition-all hidden sm:block" />
      </div>
    </Card>
  );
}
