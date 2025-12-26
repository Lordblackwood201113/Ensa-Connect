import { useNavigate } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { UserMinus, MapPin, Briefcase, ChevronRight, MessageCircle } from 'lucide-react';
import type { Profile } from '../../types';
import { messageService } from '../../lib/messages';
import { useAuth } from '../../context/AuthContext';

interface ConnectionCardProps {
  profile: Profile;
  onRemove?: () => void;
  showActions?: boolean;
}

export function ConnectionCard({
  profile,
  onRemove,
  showActions = true
}: ConnectionCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCardClick = () => {
    navigate(`/member/${profile.id}`);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.();
  };

  const handleMessage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    const { data } = await messageService.getOrCreateConversation(user.id, profile.id);
    if (data) {
      navigate(`/messages/${data.id}`);
    }
  };

  return (
    <Card
      className="group p-3 xs:p-4 hover:shadow-md hover:border-brand-primary/50 transition-all duration-200 active:scale-[0.99] active:bg-gray-50/50 cursor-pointer touch-manipulation overflow-hidden w-full max-w-full"
      onClick={handleCardClick}
    >
      <div className="flex items-center gap-2 xs:gap-3 min-w-0">
        {/* Avatar */}
        <Avatar
          src={profile.avatar_url || undefined}
          alt={profile.first_name || ''}
          size="md"
          className="w-10 h-10 xs:w-12 xs:h-12 shrink-0 flex-shrink-0"
        />

        {/* Info */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <h3 className="font-semibold text-brand-black text-sm xs:text-base group-hover:text-brand-primary transition-colors truncate">
            {profile.first_name} {profile.last_name}
          </h3>

          {profile.job_title ? (
            <p className="text-xs xs:text-sm text-gray-600 line-clamp-2 break-words flex items-start gap-1 mt-0.5">
              <Briefcase className="w-3 h-3 shrink-0 text-gray-400 mt-0.5" />
              <span className="line-clamp-2 break-words">
                {profile.job_title}
                {profile.company && (
                  <span className="text-gray-400 hidden sm:inline"> @ {profile.company}</span>
                )}
              </span>
            </p>
          ) : profile.promotion ? (
            <p className="text-xs xs:text-sm text-gray-500 mt-0.5 truncate">{profile.promotion}</p>
          ) : null}

          <div className="flex items-center gap-1.5 xs:gap-2 mt-1 text-[10px] xs:text-xs text-gray-500 min-w-0">
            {profile.promotion && profile.job_title && (
              <span className="bg-gray-100 px-1.5 py-0.5 rounded-full truncate max-w-[80px] xs:max-w-[100px] shrink-0">
                {profile.promotion}
              </span>
            )}
            {profile.city && (
              <span className="flex items-center gap-0.5 truncate min-w-0">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{profile.city}</span>
              </span>
            )}
          </div>
        </div>

        {/* Actions or Arrow */}
        <div className="flex items-center shrink-0 flex-shrink-0 ml-1 gap-1">
          {showActions && (
            <button
              onClick={handleMessage}
              className="p-1.5 xs:p-2 text-gray-300 hover:text-brand-primary hover:bg-brand-primary/10 active:bg-brand-primary/20 rounded-full transition-colors touch-manipulation shrink-0"
              title="Envoyer un message"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          )}
          {showActions && onRemove && (
            <button
              onClick={handleRemove}
              className="p-1.5 xs:p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 active:bg-red-100 rounded-full transition-colors touch-manipulation shrink-0"
              title="Retirer la connexion"
            >
              <UserMinus className="w-4 h-4" />
            </button>
          )}
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all shrink-0 hidden sm:block" />
        </div>
      </div>
    </Card>
  );
}
