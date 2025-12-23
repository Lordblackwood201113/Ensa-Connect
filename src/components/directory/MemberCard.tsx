import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import type { Profile } from '../../types';
import { MapPin, Building, ChevronRight } from 'lucide-react';

interface MemberCardProps {
  profile: Profile;
}

export function MemberCard({ profile }: MemberCardProps) {
  return (
    <Link to={`/member/${profile.id}`} className="block group">
      <Card className="p-4 sm:p-6 transition-all duration-200 hover:shadow-md hover:border-brand-lime/50 active:scale-[0.98] touch-manipulation">
        {/* Mobile: Horizontal layout / Desktop: Vertical layout */}
        <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:text-center">
          {/* Avatar */}
          <Avatar
            src={profile.avatar_url || undefined}
            alt={`${profile.first_name} ${profile.last_name}`}
            size="lg"
            className="shrink-0 sm:w-24 sm:h-24 sm:mb-2"
          />

          {/* Content */}
          <div className="flex-1 min-w-0 sm:w-full">
            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mb-2 sm:justify-center">
              <Badge variant="neutral" className="text-[10px] sm:text-xs">
                {profile.promotion || 'N/A'}
              </Badge>
              {profile.study_track && (
                <Badge variant="success" className="text-[10px] sm:text-xs truncate max-w-[120px] sm:max-w-none">
                  {profile.study_track}
                </Badge>
              )}
            </div>

            {/* Name */}
            <h3 className="font-bold text-brand-black text-base sm:text-lg truncate group-hover:text-brand-lime transition-colors">
              {profile.first_name} {profile.last_name}
            </h3>

            {/* Job Title */}
            <p className="text-sm text-gray-600 font-medium truncate">
              {profile.job_title || 'Membre ENSA'}
            </p>

            {/* Company & Location - Mobile optimized */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-400">
              {profile.company && (
                <span className="flex items-center gap-1 truncate max-w-[140px]">
                  <Building className="w-3 h-3 shrink-0" />
                  <span className="truncate">{profile.company}</span>
                </span>
              )}
              {profile.city && (
                <span className="flex items-center gap-1 truncate max-w-[140px]">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{profile.city}</span>
                </span>
              )}
            </div>
          </div>

          {/* Mobile: Arrow indicator */}
          <ChevronRight className="w-5 h-5 text-gray-300 shrink-0 sm:hidden group-hover:text-brand-lime transition-colors" />
        </div>
      </Card>
    </Link>
  );
}
