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
    <div className="sticky top-0 z-10 bg-white border-b px-3 py-3 flex items-center gap-3">
      <button
        onClick={onBack}
        className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <Avatar src={user.avatar_url || undefined} alt={fullName} size="sm" />

      <div className="flex-1 min-w-0">
        <h2 className="font-medium truncate text-sm">{fullName}</h2>
        {user.job_title && (
          <p className="text-xs text-gray-500 truncate">
            {user.job_title}
            {user.company && ` • ${user.company}`}
          </p>
        )}
      </div>

      <button
        onClick={onViewProfile}
        className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <User className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
}
