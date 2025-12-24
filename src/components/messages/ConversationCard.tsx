import { useState } from 'react';
import { ChevronRight, Trash2 } from 'lucide-react';
import type { ConversationWithDetails } from '../../types';
import { Avatar } from '../ui/Avatar';
import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  conversation: ConversationWithDetails;
  onClick: () => void;
  onDelete?: (conversationId: string) => void;
}

export function ConversationCard({ conversation, onClick, onDelete }: Props) {
  const { other_participant, last_message, unread_count } = conversation;
  const fullName = `${other_participant.first_name || ''} ${other_participant.last_name || ''}`.trim() || 'Utilisateur';
  const [showConfirm, setShowConfirm] = useState(false);

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: fr });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(conversation.id);
    setShowConfirm(false);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(false);
  };

  // Affichage de la confirmation de suppression
  if (showConfirm) {
    return (
      <div className="w-full bg-white rounded-2xl p-4 shadow-sm border-2 border-red-200">
        <p className="text-sm text-gray-700 mb-3">
          Supprimer la conversation avec <span className="font-medium">{fullName}</span> ?
        </p>
        <p className="text-xs text-gray-500 mb-4">
          Tous les messages seront supprimés définitivement.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleConfirmDelete}
            className="flex-1 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-colors"
          >
            Supprimer
          </button>
          <button
            onClick={handleCancelDelete}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3 text-left"
      >
      {/* Avatar avec badge */}
      <div className="relative shrink-0">
        <Avatar
          src={other_participant.avatar_url || undefined}
          alt={fullName}
          size="md"
        />
        {unread_count > 0 && (
          <span className="absolute -top-1 -right-1 bg-brand-purple text-white text-xs font-medium rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
            {unread_count > 99 ? '99+' : unread_count}
          </span>
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-2">
          <h3 className={cn(
            "font-medium truncate",
            unread_count > 0 && "text-gray-900"
          )}>
            {fullName}
          </h3>
          {last_message && (
            <span className="text-xs text-gray-500 shrink-0">
              {formatTime(last_message.created_at)}
            </span>
          )}
        </div>
        <p className={cn(
          "text-sm truncate mt-0.5",
          unread_count > 0 ? "text-gray-900 font-medium" : "text-gray-500"
        )}>
          {last_message?.content || "Démarrer la conversation..."}
        </p>
        {other_participant.job_title && (
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {other_participant.job_title}
            {other_participant.company && ` • ${other_participant.company}`}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Bouton supprimer */}
        {onDelete && (
          <button
            onClick={handleDelete}
            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
            title="Supprimer la conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        {/* Chevron */}
        <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
      </div>
      </button>
    </div>
  );
}
