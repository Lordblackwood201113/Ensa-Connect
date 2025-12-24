import { useNavigate } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { Clock, ChevronRight, X, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { connectionService } from '../../lib/connections';
import type { Connection } from '../../types';

interface SentRequestCardProps {
  connection: Connection;
  onUpdate: () => void;
}

export function SentRequestCard({ connection, onUpdate }: SentRequestCardProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const receiver = connection.receiver;
  if (!receiver) return null;

  const handleCardClick = () => {
    navigate(`/member/${receiver.id}`);
  };

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading) return;

    setIsLoading(true);
    try {
      await connectionService.removeConnection(connection.id);
      onUpdate();
    } finally {
      setIsLoading(false);
    }
  };

  const timeAgo = getTimeAgo(connection.created_at);

  return (
    <Card
      className="group p-3 xs:p-4 hover:shadow-md hover:border-brand-lime/50 transition-all duration-200 active:scale-[0.99] cursor-pointer touch-manipulation overflow-hidden w-full max-w-full"
      onClick={handleCardClick}
    >
      <div className="flex items-center gap-2 xs:gap-3 min-w-0">
        {/* Avatar */}
        <Avatar
          src={receiver.avatar_url || undefined}
          alt={receiver.first_name || ''}
          size="md"
          className="w-10 h-10 xs:w-12 xs:h-12 shrink-0 flex-shrink-0"
        />

        {/* Info */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <h3 className="font-semibold text-brand-black text-sm xs:text-base group-hover:text-brand-lime transition-colors truncate">
            {receiver.first_name} {receiver.last_name}
          </h3>
          <p className="text-xs xs:text-sm text-gray-500 line-clamp-2 break-words">
            {receiver.job_title || receiver.promotion || 'Membre ENSA'}
          </p>
          <div className="flex items-center gap-1.5 xs:gap-2 mt-1 min-w-0">
            <span className="inline-flex items-center gap-1 text-[10px] xs:text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
              <Clock className="w-3 h-3 shrink-0" />
              <span className="hidden xs:inline">En attente</span>
              <span className="xs:hidden">Attente</span>
            </span>
            <span className="text-[10px] xs:text-xs text-gray-400 truncate min-w-0">{timeAgo}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center shrink-0 flex-shrink-0 ml-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 rounded-full transition-colors touch-manipulation disabled:opacity-50 shrink-0"
            title="Annuler la demande"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
          </button>
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-lime group-hover:translate-x-0.5 transition-all shrink-0 hidden sm:block" />
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
  if (diffMins < 60) return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}j`;

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
