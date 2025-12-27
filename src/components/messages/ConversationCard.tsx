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
    return formatDistanceToNow(new Date(dateString), { addSuffix: false, locale: fr });
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

  // Affichage de la confirmation de suppression - Optimisé mobile
  if (showConfirm) {
    return (
      <div className="w-full bg-white rounded-2xl p-3 sm:p-4 border border-red-200 shadow-sm">
        <p className="text-sm text-gray-700 mb-2">
          Supprimer la conversation avec <span className="font-semibold">{fullName}</span> ?
        </p>
        <p className="text-[11px] text-gray-400 mb-3">
          Tous les messages seront supprimés.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleConfirmDelete}
            className="flex-1 py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl active:scale-[0.98] transition-transform touch-manipulation"
          >
            Supprimer
          </button>
          <button
            onClick={handleCancelDelete}
            className="flex-1 py-2.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-xl active:scale-[0.98] transition-transform touch-manipulation"
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
        className="w-full bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100 hover:shadow-md active:scale-[0.99] transition-all flex items-center gap-3 text-left touch-manipulation"
      >
        {/* Avatar avec badge - Compact sur mobile */}
        <div className="relative shrink-0">
          <Avatar
            src={other_participant.avatar_url || undefined}
            alt={fullName}
            size="sm"
          />
          {unread_count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-brand-primary text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
              {unread_count > 9 ? '9+' : unread_count}
            </span>
          )}
        </div>

        {/* Contenu - Layout optimisé mobile */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {/* Ligne 1: Nom + Temps */}
          <div className="flex items-center justify-between gap-2">
            <h3 className={cn(
              "font-semibold text-sm truncate",
              unread_count > 0 ? "text-brand-black" : "text-gray-700"
            )}>
              {fullName}
            </h3>
            {last_message && (
              <span className="text-[10px] text-gray-400 shrink-0">
                {formatTime(last_message.created_at)}
              </span>
            )}
          </div>

          {/* Ligne 2: Dernier message */}
          <p className={cn(
            "text-[13px] truncate mt-0.5",
            unread_count > 0 ? "text-gray-800 font-medium" : "text-gray-500"
          )}>
            {last_message?.content || "Démarrer la conversation..."}
          </p>

          {/* Ligne 3: Job title (optionnel) - Seulement desktop */}
          {other_participant.job_title && (
            <p className="hidden sm:block text-[11px] text-gray-400 truncate mt-0.5">
              {other_participant.job_title}
              {other_participant.company && ` · ${other_participant.company}`}
            </p>
          )}
        </div>

        {/* Actions - Visible sur hover desktop, toujours sur mobile */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Bouton supprimer - Plus visible sur mobile */}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all sm:opacity-0 sm:group-hover:opacity-100 touch-manipulation"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {/* Chevron - Plus petit sur mobile */}
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
        </div>
      </button>
    </div>
  );
}
