import { ArrowLeft, User } from 'lucide-react';
import type { Profile } from '../../types';
import { Avatar } from '../ui/Avatar';

interface Props {
  user: Profile;
  onBack: () => void;
  onViewProfile: () => void;
}

export function ConversationHeader({ user, onBack, onViewProfile }: Props) {
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Utilisateur';

  return (
    <div className="bg-white border-b border-gray-100 safe-area-inset-top">
      <div className="px-3 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors touch-manipulation"
          aria-label="Retour"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <button
          onClick={onViewProfile}
          className="flex items-center gap-3 flex-1 min-w-0 hover:bg-gray-50 active:bg-gray-100 rounded-xl py-1 px-1 -my-1 transition-colors touch-manipulation"
        >
          <Avatar src={user.avatar_url || undefined} alt={fullName} size="sm" />
          <div className="flex-1 min-w-0 text-left">
            <h2 className="font-semibold truncate text-[15px] text-gray-900">{fullName}</h2>
            {user.job_title && (
              <p className="text-xs text-gray-500 truncate">
                {user.job_title}
                {user.company && ` • ${user.company}`}
              </p>
            )}
          </div>
        </button>

        <button
          onClick={onViewProfile}
          className="p-2 -mr-2 hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors touch-manipulation"
          aria-label="Voir le profil"
        >
          <User className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
