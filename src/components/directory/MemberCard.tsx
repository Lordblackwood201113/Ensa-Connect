import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { Profile } from '../../types';
import { MapPin } from 'lucide-react';

interface MemberCardProps {
  profile: Profile;
}

export function MemberCard({ profile }: MemberCardProps) {
  return (
    <Card className="flex flex-col items-center text-center h-full">
      <Avatar 
        src={profile.avatar_url || undefined} 
        alt={`${profile.first_name} ${profile.last_name}`} 
        size="xl" 
        className="mb-4"
      />
      
      <div className="flex flex-wrap justify-center gap-2 mb-2">
          <Badge variant="neutral">
            Promo {profile.promotion}
          </Badge>
          {profile.study_track && (
            <Badge variant="success">
              {profile.study_track}
            </Badge>
          )}
      </div>
      
      <h3 className="text-lg font-bold text-brand-black mb-1">
        {profile.first_name} {profile.last_name}
      </h3>
      
      <p className="text-sm text-gray-500 font-medium mb-1">
        {profile.job_title || 'Étudiant / Alumni'}
      </p>
      <p className="text-sm text-gray-400 mb-4">
         {profile.company ? `@ ${profile.company}` : ''}
      </p>
      
      <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-6">
        <MapPin className="w-3 h-3" />
        <span>{profile.city || 'Localisation inconnue'}</span>
      </div>
      
      <div className="mt-auto w-full">
        <Link to={`/member/${profile.id}`}>
            <Button variant="outline" className="w-full rounded-pill">
            Voir profil
            </Button>
        </Link>
      </div>
    </Card>
  );
}

