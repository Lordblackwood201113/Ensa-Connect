import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { messageService } from '../lib/messages';
import type { Message, Profile } from '../types';
import { MessageBubble } from '../components/messages/MessageBubble';
import { MessageInput } from '../components/messages/MessageInput';
import { ConversationHeader } from '../components/messages/ConversationHeader';
import { supabase } from '../lib/supabase';

export function Conversation() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Charger les données initiales
  useEffect(() => {
    if (!conversationId || !user) return;

    const loadData = async () => {
      setLoading(true);

      // Charger l'autre participant
      const { data: participant } = await messageService.getOtherParticipant(conversationId, user.id);
      setOtherUser(participant);

      // Charger les messages
      const { data: msgs } = await messageService.getMessages(conversationId);
      setMessages(msgs);

      // Marquer comme lus
      await messageService.markAsRead(conversationId, user.id);

      setLoading(false);
      setTimeout(() => scrollToBottom('auto'), 100);
    };

    loadData();
  }, [conversationId, user]);

  // S'abonner aux nouveaux messages
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;

          // Ne pas ajouter si c'est notre propre message (déjà ajouté optimistiquement)
          if (newMsg.sender_id === user.id) return;

          // Récupérer le message complet avec les infos du sender
          const { data } = await messageService.getMessages(conversationId);
          if (data.length > 0) {
            setMessages(data);
          }

          // Marquer comme lu
          await messageService.markAsRead(conversationId, user.id);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  const handleSend = async () => {
    if (!newMessage.trim() || !conversationId || !user || sending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Ajout optimiste
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      is_read: false,
      read_at: null,
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    scrollToBottom();

    const { data, error } = await messageService.sendMessage(conversationId, user.id, content);

    if (error) {
      // Retirer le message optimiste en cas d'erreur
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      console.error('Error sending message:', error);
    } else if (data) {
      // Remplacer le message optimiste par le vrai
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMessage.id ? data : m))
      );
    }

    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
      </div>
    );
  }

  if (!otherUser) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Conversation introuvable</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50">
      {/* Header */}
      <ConversationHeader
        user={otherUser}
        onBack={() => navigate('/messages')}
        onViewProfile={() => navigate(`/member/${otherUser.id}`)}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            Envoyez votre premier message !
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.sender_id === user?.id;
            const showAvatar =
              !isOwn &&
              (index === 0 || messages[index - 1].sender_id !== msg.sender_id);

            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={isOwn}
                showAvatar={showAvatar}
                senderProfile={!isOwn ? otherUser : undefined}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput
        value={newMessage}
        onChange={setNewMessage}
        onSend={handleSend}
        sending={sending}
      />
    </div>
  );
}
