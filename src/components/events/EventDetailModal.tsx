import { MapPin, Calendar as CalendarIcon, Clock, User } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import type { Event } from '../../types';
import { Link } from 'react-router-dom';

interface EventDetailModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EventDetailModal({ event, isOpen, onClose }: EventDetailModalProps) {
  if (!event) return null;

  const eventDate = new Date(event.event_date);
  const isPast = eventDate < new Date();

  const formattedDate = eventDate.toLocaleDateString('fr-FR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'
  });

  const formattedTime = eventDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Détails de l'événement" size="lg">
      {/* Header Image */}
      <div className="relative h-48 sm:h-64 bg-gray-100">
        {event.image_url ? (
          <img 
            src={event.image_url} 
            alt={event.title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-lime/30 to-brand-lime/10">
            <CalendarIcon className="w-12 h-12 sm:w-16 sm:h-16 text-brand-lime" />
          </div>
        )}

        {/* Past event overlay */}
        {isPast && (
          <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
            <span className="bg-white text-gray-700 text-sm font-medium px-4 py-2 rounded-full">
              Événement terminé
            </span>
          </div>
        )}

        {/* Date badge overlay */}
        <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 bg-white rounded-xl shadow-lg overflow-hidden flex text-center">
          <div className="bg-brand-black text-white text-xs sm:text-sm py-2 px-3 sm:px-4 font-bold uppercase">
            {eventDate.toLocaleDateString('fr-FR', { month: 'short' })}
          </div>
          <div className="py-2 px-3 sm:px-4 font-bold text-xl sm:text-2xl text-gray-900">
            {eventDate.getDate()}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Title & Meta */}
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-black mb-4">
          {event.title}
        </h2>

        {/* Date & Location cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 sm:p-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-brand-purple/10 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-brand-purple" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 uppercase font-medium">Date</p>
              <p className="text-sm sm:text-base font-semibold text-brand-black capitalize truncate">
                {formattedDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 sm:p-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-brand-lime/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 uppercase font-medium">Heure</p>
              <p className="text-sm sm:text-base font-semibold text-brand-black">
                {formattedTime}
              </p>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 sm:p-4 mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 uppercase font-medium">Lieu</p>
            <p className="text-sm sm:text-base font-semibold text-brand-black">
              {event.location || 'En ligne'}
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3">
            À propos de cet événement
          </h3>
          <p className="whitespace-pre-line text-sm sm:text-base text-gray-600 leading-relaxed">
            {event.description}
          </p>
        </div>

        {/* Organizer */}
        <div className="border-t border-gray-100 pt-4 sm:pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link 
            to={`/member/${event.organizer?.id}`}
            onClick={onClose}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Avatar 
              src={event.organizer?.avatar_url || undefined} 
              alt={event.organizer?.last_name || 'Organisateur'} 
              size="md" 
            />
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Organisé par</p>
              <p className="font-bold text-brand-black">
                {event.organizer?.first_name} {event.organizer?.last_name}
              </p>
            </div>
          </Link>
          
          {/* Future: RSVP button */}
          {!isPast && (
            <Button variant="secondary" className="w-full sm:w-auto gap-2" disabled>
              <User className="w-4 h-4" />
              S'inscrire (bientôt)
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
