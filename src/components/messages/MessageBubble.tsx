import type { Message, Profile } from '../../types';
import { Avatar } from '../ui/Avatar';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  senderProfile?: Profile;
}

export function MessageBubble({ message, isOwn, showAvatar, senderProfile }: Props) {
  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: fr });
  };

  const senderName = senderProfile
    ? `${senderProfile.first_name} ${senderProfile.last_name}`.trim()
    : 'Utilisateur';

  return (
    <div
      className={cn(
        'flex items-end gap-2',
        isOwn ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar (seulement pour les messages reçus, groupé) */}
      {!isOwn && showAvatar && senderProfile && (
        <Avatar
          src={senderProfile.avatar_url || undefined}
          alt={senderName}
          size="sm"
        />
      )}
      {!isOwn && !showAvatar && <div className="w-8" />}

      {/* Bulle */}
      <div
        className={cn(
          'max-w-[75%] px-4 py-2.5 rounded-2xl',
          isOwn
            ? 'bg-brand-purple text-white rounded-br-md'
            : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <span
          className={cn(
            'text-[10px] mt-1 block text-right',
            isOwn ? 'text-purple-200' : 'text-gray-400'
          )}
        >
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  );
}
