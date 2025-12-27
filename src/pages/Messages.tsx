import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MessageCircle, Search, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { messageService } from '../lib/messages';
import type { ConversationWithDetails } from '../types';
import { ConversationCard } from '../components/messages/ConversationCard';
import { EmptyMessages } from '../components/messages/EmptyMessages';
import { supabase } from '../lib/supabase';

export function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Handle ?new=userId parameter - create conversation and redirect
  useEffect(() => {
    const newUserId = searchParams.get('new');
    if (!newUserId || !user) return;

    const createAndNavigate = async () => {
      const { data: conversation, error } = await messageService.getOrCreateConversation(user.id, newUserId);
      if (conversation && !error) {
        navigate(`/messages/${conversation.id}`, { replace: true });
      } else if (error) {
        console.error('Error creating conversation:', error);
        alert(error.message);
        navigate('/messages', { replace: true });
      }
    };

    createAndNavigate();
  }, [searchParams, user, navigate]);

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

  const handleDeleteAll = async () => {
    if (!user || deleting) return;
    setDeleting(true);
    const { error } = await messageService.deleteAllConversations(user.id);
    if (!error) {
      setConversations([]);
    }
    setDeleting(false);
    setShowDeleteAll(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 -m-4 sm:-m-6 p-3 sm:p-6 pb-24">
      {/* Modal de confirmation de suppression totale */}
      {showDeleteAll && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-center text-brand-black mb-2">
              Supprimer toutes les conversations ?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-5">
              Cette action est irréversible. Tous vos messages seront définitivement supprimés.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteAll(false)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl active:scale-[0.98] transition-transform touch-manipulation disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl active:scale-[0.98] transition-transform touch-manipulation disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Supprimer tout'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header compact */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-xl flex items-center justify-center shadow-sm">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-brand-black leading-tight">Messages</h1>
              {conversations.length > 0 && (
                <p className="text-[11px] text-gray-400">
                  {conversations.length} conversation{conversations.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          {conversations.length > 0 && (
            <button
              onClick={() => setShowDeleteAll(true)}
              className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all touch-manipulation"
              title="Supprimer toutes les conversations"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Barre de recherche - Plus compacte sur mobile */}
        {conversations.length > 0 && (
          <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-brand-primary/20 text-sm focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Liste des conversations */}
      {conversations.length === 0 ? (
        <EmptyMessages />
      ) : filteredConversations.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">Aucun résultat pour "{search}"</p>
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
