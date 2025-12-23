import { useEffect, useState } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Event } from '../types';
import { EventCard } from '../components/events/EventCard';
import { CreateEventModal } from '../components/events/CreateEventModal';
import { EventDetailModal } from '../components/events/EventDetailModal';
import { Button } from '../components/ui/Button';

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          organizer:profiles(*)
        `)
        .order('event_date', { ascending: true });

      if (error) throw error;
      
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) return;

    try {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const upcomingEvents = events.filter(e => new Date(e.event_date) >= new Date());
  const pastEvents = events.filter(e => new Date(e.event_date) < new Date());

  return (
    <div className="space-y-6 sm:space-y-8 pb-20 sm:pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-black">Événements</h1>
          <p className="text-sm text-gray-500 hidden sm:block">Découvrez et participez aux événements</p>
        </div>
        
        {/* Desktop button */}
        <Button 
          onClick={() => { setEventToEdit(null); setIsCreateModalOpen(true); }} 
          className="hidden sm:flex gap-2"
        >
          <Plus className="w-5 h-5" />
          Créer un événement
        </Button>
      </div>

      {/* Upcoming Events */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <span className="text-xl">📅</span> 
            <span>À venir</span>
            <span className="text-sm font-normal text-gray-400 ml-1">
              ({upcomingEvents.length})
            </span>
          </h2>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="h-36 sm:h-48 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingEvents.map((event) => (
              <EventCard 
                key={event.id} 
                event={event} 
                onViewDetail={(e) => setSelectedEvent(e)}
                onEdit={(e) => { setEventToEdit(e); setIsCreateModalOpen(true); }}
                onDelete={handleDeleteEvent}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-2xl p-8 sm:p-10 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium mb-1">Aucun événement à venir</p>
            <p className="text-sm text-gray-400 mb-4">Soyez le premier à en créer un !</p>
            <Button variant="outline" onClick={() => { setEventToEdit(null); setIsCreateModalOpen(true); }}>
              Créer un événement
            </Button>
          </div>
        )}
      </section>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <section className="pt-6 sm:pt-8 border-t border-gray-200">
          <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2 text-gray-500">
            <span className="text-xl">🕰️</span>
            <span>Passés</span>
            <span className="text-sm font-normal text-gray-400 ml-1">
              ({pastEvents.length})
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastEvents.map((event) => (
              <EventCard 
                key={event.id} 
                event={event} 
                onViewDetail={(e) => setSelectedEvent(e)}
                onEdit={(e) => { setEventToEdit(e); setIsCreateModalOpen(true); }}
                onDelete={handleDeleteEvent}
              />
            ))}
          </div>
        </section>
      )}

      {/* Floating Action Button - Mobile only */}
      <button
        onClick={() => { setEventToEdit(null); setIsCreateModalOpen(true); }}
        className="sm:hidden fixed bottom-6 right-4 w-14 h-14 bg-brand-black text-white rounded-full shadow-lg flex items-center justify-center z-30 active:scale-95 transition-transform touch-manipulation"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modals */}
      <CreateEventModal 
        isOpen={isCreateModalOpen} 
        onClose={() => { setIsCreateModalOpen(false); setEventToEdit(null); }} 
        onSuccess={fetchEvents}
        eventToEdit={eventToEdit}
      />

      <EventDetailModal 
        isOpen={!!selectedEvent}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
