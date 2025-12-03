import { X, MapPin, Calendar as CalendarIcon } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import type { Event } from '../../types';

interface EventDetailModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EventDetailModal({ event, isOpen, onClose }: EventDetailModalProps) {
  if (!isOpen || !event) return null;

  const eventDate = new Date(event.event_date);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl relative">
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur-md p-2 rounded-full hover:bg-white transition-colors shadow-sm"
        >
            <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Header Image */}
        <div className="relative h-64 bg-gray-100">
            {event.image_url ? (
                <img 
                    src={event.image_url} 
                    alt={event.title} 
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-brand-lime/20">
                    <CalendarIcon className="w-16 h-16 text-brand-lime" />
                </div>
            )}
        </div>

        <div className="p-8">
            <div className="flex gap-4 mb-6">
                <div className="flex-1">
                    <h2 className="text-3xl font-bold text-brand-black mb-2">{event.title}</h2>
                    <div className="flex flex-wrap gap-4 text-gray-500">
                        <div className="flex items-center gap-1.5">
                            <CalendarIcon className="w-5 h-5 text-brand-purple" />
                            <span className="font-medium">
                                {eventDate.toLocaleDateString('fr-FR', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <MapPin className="w-5 h-5 text-brand-lime" />
                            <span className="font-medium">{event.location}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="prose prose-gray max-w-none mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-2">À propos de cet événement</h3>
                <p className="whitespace-pre-line text-gray-600 leading-relaxed">
                    {event.description}
                </p>
            </div>

            <div className="border-t border-gray-100 pt-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar 
                        src={event.organizer?.avatar_url || undefined} 
                        alt={event.organizer?.last_name || 'Organisateur'} 
                        size="md" 
                    />
                    <div>
                        <p className="text-sm text-gray-500">Organisé par</p>
                        <p className="font-bold text-brand-black">
                            {event.organizer?.first_name} {event.organizer?.last_name}
                        </p>
                    </div>
                </div>
                {/* Future feature: Register button */}
                {/* <Button>S'inscrire</Button> */}
            </div>
        </div>
      </div>
    </div>
  );
}






