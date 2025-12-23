import { Calendar, MapPin, Eye, Edit2, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import type { Event } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface EventCardProps {
  event: Event;
  onViewDetail: (event: Event) => void;
  onEdit?: (event: Event) => void;
  onDelete?: (eventId: string) => void;
}

export function EventCard({ event, onViewDetail, onEdit, onDelete }: EventCardProps) {
  const { user } = useAuth();
  const eventDate = new Date(event.event_date);
  const isOwner = user?.id === event.organizer_id;
  const isPast = eventDate < new Date();
  
  return (
    <Card
      className="h-full flex flex-col overflow-hidden p-0 group hover:shadow-lg hover:border-brand-lime/50 transition-all duration-300 relative active:scale-[0.98] touch-manipulation cursor-pointer"
      onClick={() => onViewDetail(event)}
    >
      {/* Image Section - Smaller on mobile */}
      <div className="relative h-36 sm:h-48 bg-gray-100 overflow-hidden">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-lime/30 to-brand-lime/10">
            <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-brand-lime" />
          </div>
        )}

        {/* Date Badge - Smaller on mobile */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-white rounded-lg sm:rounded-xl shadow-md overflow-hidden flex flex-col text-center w-12 sm:w-16 z-10 group-hover:shadow-lg transition-shadow">
          <div className="bg-brand-black text-white text-[10px] sm:text-xs py-0.5 sm:py-1 font-bold uppercase group-hover:bg-brand-lime transition-colors">
            {eventDate.toLocaleDateString('fr-FR', { month: 'short' })}
          </div>
          <div className="py-1 sm:py-2 font-bold text-lg sm:text-xl text-gray-900">
            {eventDate.getDate()}
          </div>
        </div>

        {/* Past event overlay */}
        {isPast && (
          <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center">
            <span className="bg-white/90 text-gray-700 text-xs font-medium px-3 py-1 rounded-full">
              Terminé
            </span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        <h3 className="text-base sm:text-xl font-bold text-gray-900 mb-1.5 sm:mb-2 line-clamp-2 leading-tight group-hover:text-brand-lime transition-colors">
          {event.title}
        </h3>

        <div className="flex items-center text-gray-500 text-xs sm:text-sm mb-3 sm:mb-4">
          <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 shrink-0" />
          <span className="line-clamp-1">{event.location || 'En ligne'}</span>
        </div>

        <p className="text-gray-600 text-xs sm:text-sm line-clamp-2 sm:line-clamp-3 mb-4 flex-1">
          {event.description}
        </p>

        {/* Footer Section */}
        <div 
          className="border-t border-gray-100 pt-3 sm:pt-4 mt-auto flex items-center justify-between gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Organizer */}
          <div className="flex items-center gap-2 min-w-0">
            <Avatar 
              src={event.organizer?.avatar_url || undefined} 
              alt={event.organizer?.last_name || 'Organisateur'} 
              size="sm" 
              className="w-7 h-7 sm:w-8 sm:h-8"
            />
            <div className="text-xs min-w-0">
              <p className="text-gray-500 hidden sm:block">Organisé par</p>
              <p className="font-medium text-gray-700 truncate">
                {event.organizer?.first_name} {event.organizer?.last_name?.charAt(0)}.
              </p>
            </div>
          </div>
           
          {/* Actions */}
          <div className="flex gap-1">
            {isOwner && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-400 hover:text-brand-black hover:bg-gray-100 p-2"
                  onClick={() => onEdit && onEdit(event)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2"
                  onClick={() => onDelete && onDelete(event.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-400 hover:text-brand-purple hover:bg-brand-purple/5 p-2"
              onClick={() => onViewDetail(event)}
            >
              <Eye className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
