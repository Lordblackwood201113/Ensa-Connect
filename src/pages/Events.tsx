import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
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
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-brand-black">Événements</h1>
          <p className="text-gray-500">Découvrez et participez aux événements de la communauté</p>
        </div>
        <Button onClick={() => { setEventToEdit(null); setIsCreateModalOpen(true); }} className="gap-2 shadow-lg hover:shadow-xl transition-shadow">
          <Plus className="w-5 h-5" />
          Créer un événement
        </Button>
      </div>

      {/* Upcoming Events */}
      <section>
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
           📅 À venir
        </h2>
        {loading ? (
            <div className="text-center py-10">Chargement...</div>
        ) : upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <div className="bg-gray-50 rounded-2xl p-10 text-center">
                <p className="text-gray-500 mb-4">Aucun événement à venir pour le moment.</p>
                <Button variant="outline" onClick={() => { setEventToEdit(null); setIsCreateModalOpen(true); }}>
                    Soyez le premier à en créer un !
                </Button>
            </div>
        )}
      </section>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <section className="pt-8 border-t border-gray-200">
             <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-500">
                🕰️ Événements passés
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60 hover:opacity-100 transition-opacity">
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



