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
  
  return (
    <Card className="h-full flex flex-col overflow-hidden p-0 group hover:shadow-lg transition-shadow duration-300 relative">
      {/* Image Section */}
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        {event.image_url ? (
          <img 
            src={event.image_url} 
            alt={event.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-brand-lime/20">
             <Calendar className="w-12 h-12 text-brand-lime" />
          </div>
        )}
        
        {/* Date Badge */}
        <div className="absolute top-4 right-4 bg-white rounded-xl shadow-md overflow-hidden flex flex-col text-center w-16 z-10">
           <div className="bg-brand-black text-white text-xs py-1 font-bold uppercase">
              {eventDate.toLocaleDateString('fr-FR', { month: 'short' })}
           </div>
           <div className="py-2 font-bold text-xl text-gray-900">
              {eventDate.getDate()}
           </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
          {event.title}
        </h3>

        <div className="flex items-center text-gray-500 text-sm mb-4">
          <MapPin className="w-4 h-4 mr-1" />
          <span className="line-clamp-1">{event.location || 'En ligne'}</span>
        </div>

        <p className="text-gray-600 text-sm line-clamp-3 mb-6 flex-1">
          {event.description}
        </p>

        {/* Footer Section */}
        <div className="border-t border-gray-100 pt-4 mt-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
           <div className="flex items-center gap-2">
              <Avatar 
                src={event.organizer?.avatar_url || undefined} 
                alt={event.organizer?.last_name || 'Organisateur'} 
                size="sm" 
                className="w-8 h-8"
              />
              <div className="text-xs">
                 <p className="text-gray-500">Organisé par</p>
                 <p className="font-medium text-gray-900">
                    {event.organizer?.first_name} {event.organizer?.last_name}
                 </p>
              </div>
           </div>
           
           <div className="flex gap-1 w-full sm:w-auto justify-end">
               {isOwner && (
                   <>
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="text-gray-500 hover:text-brand-black hover:bg-gray-100 px-2"
                         onClick={(e) => { e.stopPropagation(); onEdit && onEdit(event); }}
                       >
                         <Edit2 className="w-4 h-4" />
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="text-gray-500 hover:text-red-600 hover:bg-red-50 px-2"
                         onClick={(e) => { e.stopPropagation(); onDelete && onDelete(event.id); }}
                       >
                         <Trash2 className="w-4 h-4" />
                       </Button>
                   </>
               )}
               <Button 
                 variant="ghost" 
                 size="sm" 
                 className="text-gray-500 hover:text-brand-purple hover:bg-brand-purple/5 px-2"
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

