import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { Check, X, Loader2, ChevronRight } from 'lucide-react';
import { connectionService } from '../../lib/connections';
import type { Connection } from '../../types';

interface PendingRequestCardProps {
  connection: Connection;
  onUpdate: () => void;
}

export function PendingRequestCard({ connection, onUpdate }: PendingRequestCardProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<'accept' | 'reject' | null>(null);

  const requester = connection.requester;
  if (!requester) return null;

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading('accept');
    try {
      await connectionService.respondToRequest(connection.id, 'accepted');
      onUpdate();
    } finally {
      setIsLoading(null);
    }
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading('reject');
    try {
      await connectionService.respondToRequest(connection.id, 'rejected');
      onUpdate();
    } finally {
      setIsLoading(null);
    }
  };

  const handleCardClick = () => {
    navigate(`/member/${requester.id}`);
  };

  const timeAgo = getTimeAgo(connection.created_at);

  return (
    <Card
      className="group p-3 xs:p-4 hover:shadow-md hover:border-brand-lime/50 transition-all duration-200 active:scale-[0.99] cursor-pointer touch-manipulation overflow-hidden w-full max-w-full"
      onClick={handleCardClick}
    >
      <div className="flex items-center gap-2 xs:gap-3 min-w-0">
        {/* Avatar with notification dot */}
        <div className="relative shrink-0 flex-shrink-0">
          <Avatar
            src={requester.avatar_url || undefined}
            alt={requester.first_name || ''}
            size="md"
            className="w-10 h-10 xs:w-12 xs:h-12"
          />
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 xs:w-3 xs:h-3 bg-brand-purple rounded-full border-2 border-white" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <h3 className="font-semibold text-brand-black text-sm xs:text-base group-hover:text-brand-lime transition-colors truncate">
            {requester.first_name} {requester.last_name}
          </h3>
          <p className="text-xs xs:text-sm text-gray-500 line-clamp-2 break-words">
            {requester.job_title || requester.promotion || 'Membre ENSA'}
          </p>
          <p className="text-[10px] xs:text-xs text-gray-400 mt-0.5 truncate">{timeAgo}</p>
        </div>

        {/* Actions - Mobile optimized */}
        <div className="flex items-center gap-1 xs:gap-1.5 shrink-0 flex-shrink-0 ml-1" onClick={(e) => e.stopPropagation()}>
          {/* Accept button */}
          <button
            onClick={handleAccept}
            disabled={isLoading !== null}
            className="flex items-center justify-center gap-1 px-2 xs:px-3 py-1.5 xs:py-2 bg-brand-black text-white text-xs font-medium rounded-full hover:bg-brand-black/90 active:scale-95 disabled:opacity-50 transition-all touch-manipulation min-w-[32px] xs:min-w-[40px] shrink-0"
          >
            {isLoading === 'accept' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline text-sm">Accepter</span>
          </button>

          {/* Reject button */}
          <button
            onClick={handleReject}
            disabled={isLoading !== null}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 rounded-full disabled:opacity-50 transition-colors touch-manipulation shrink-0"
          >
            {isLoading === 'reject' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
          </button>

          {/* Arrow for profile navigation hint */}
          <ChevronRight className="w-4 h-4 text-gray-300 hidden sm:block group-hover:text-brand-lime group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>
      </div>
    </Card>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
