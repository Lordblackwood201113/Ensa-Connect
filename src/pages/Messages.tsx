import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Search, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { messageService } from '../lib/messages';
import type { ConversationWithDetails } from '../types';
import { ConversationCard } from '../components/messages/ConversationCard';
import { EmptyMessages } from '../components/messages/EmptyMessages';
import { supabase } from '../lib/supabase';

export function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      setLoading(true);
      const { data } = await messageService.getConversations(user.id);
      setConversations(data);
      setLoading(false);
    };

    fetchConversations();

    // S'abonner aux changements real-time
    const channel = supabase
      .channel('conversations_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filteredConversations = conversations.filter((conv) => {
    if (!search.trim()) return true;
    const name = `${conv.other_participant.first_name} ${conv.other_participant.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const handleDeleteConversation = async (conversationId: string) => {
    const { error } = await messageService.deleteConversation(conversationId);
    if (!error) {
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <MessageCircle className="w-6 h-6" />
          Messages
        </h1>

        {conversations.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une conversation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl border-0 focus:ring-2 focus:ring-brand-primary text-sm"
            />
          </div>
        )}
      </div>

      {/* Liste des conversations */}
      {conversations.length === 0 ? (
        <EmptyMessages />
      ) : filteredConversations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Aucune conversation trouvée pour "{search}"
        </div>
      ) : (
        <div className="space-y-2">
          {filteredConversations.map((conv) => (
            <ConversationCard
              key={conv.id}
              conversation={conv}
              onClick={() => navigate(`/messages/${conv.id}`)}
              onDelete={handleDeleteConversation}
            />
          ))}
        </div>
      )}
    </div>
  );
}
