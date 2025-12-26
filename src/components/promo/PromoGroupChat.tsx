import { useState, useEffect, useRef } from 'react';
import { Loader2, MessageCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { promoGroupService } from '../../lib/promoGroup';
import type { PromoGroupMessage } from '../../lib/promoGroup';
import type { Profile } from '../../types';
import { MentionInput, extractMentions, renderContentWithMentions } from '../discussions/MentionInput';
import { mentionService } from '../../lib/mentions';
import { Avatar } from '../ui/Avatar';
import { supabase } from '../../lib/supabase';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

interface PromoGroupChatProps {
  promotion: string;
}

export function PromoGroupChat({ promotion }: PromoGroupChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<PromoGroupMessage[]>([]);
  const [promoMembers, setPromoMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Charger les messages et les membres
  useEffect(() => {
    if (!promotion) return;

    const loadData = async () => {
      setLoading(true);

      // Charger les messages
      const { data: msgs } = await promoGroupService.getMessages(promotion);
      setMessages(msgs);

      // Charger les membres pour les mentions
      const members = await promoGroupService.getPromoMembers(promotion);
      setPromoMembers(members);

      setLoading(false);
      setTimeout(() => scrollToBottom('auto'), 100);
    };

    loadData();
  }, [promotion]);

  // S'abonner aux nouveaux messages en temps réel
  useEffect(() => {
    if (!promotion || !user) return;

    const channel = supabase
      .channel(`promo_group:${promotion}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'promo_group_messages',
          filter: `promotion=eq.${promotion}`,
        },
        async (payload) => {
          const newMsg = payload.new as PromoGroupMessage;

          // Ne pas ajouter si c'est notre propre message (déjà ajouté optimistiquement)
          if (newMsg.sender_id === user.id) return;

          // Récupérer le message complet avec les infos du sender
          const { data } = await promoGroupService.getMessages(promotion);
          if (data.length > 0) {
            setMessages(data);
          }
          scrollToBottom();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'promo_group_messages',
          filter: `promotion=eq.${promotion}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [promotion, user]);

  const handleSend = async () => {
    if (!newMessage.trim() || !promotion || !user || sending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Ajout optimiste
    const optimisticMessage: PromoGroupMessage = {
      id: `temp-${Date.now()}`,
      promotion,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      sender: {
        id: user.id,
        first_name: user.user_metadata?.first_name || null,
        last_name: user.user_metadata?.last_name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        promotion: promotion,
      } as Profile,
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    scrollToBottom();

    const { data, error } = await promoGroupService.sendMessage(promotion, user.id, content);

    if (error) {
      // Retirer le message optimiste en cas d'erreur
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      console.error('Error sending message:', error);
    } else if (data) {
      // Remplacer le message optimiste par le vrai
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMessage.id ? data : m))
      );

      const senderName = `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 'Quelqu\'un';
      let mentionedUserIds: string[] = [];

      // Extraire et notifier les mentions
      const mentionedNames = extractMentions(content);
      if (mentionedNames.length > 0) {
        mentionedUserIds = await mentionService.findMentionedUserIds(mentionedNames, promoMembers);

        await promoGroupService.createMentionNotifications(
          mentionedUserIds,
          user.id,
          senderName,
          promotion,
          content
        );
      }

      // Notifier tous les autres membres du groupe (sauf mentions déjà notifiées)
      await promoGroupService.createGroupMessageNotifications(
        promotion,
        user.id,
        senderName,
        content,
        mentionedUserIds
      );
    }

    setSending(false);
  };

  const handleDeleteMessage = async (messageId: string) => {
    const { error } = await promoGroupService.deleteMessage(messageId);
    if (!error) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
  };

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: fr });
    } else if (isYesterday(date)) {
      return 'Hier ' + format(date, 'HH:mm', { locale: fr });
    } else {
      return format(date, 'd MMM HH:mm', { locale: fr });
    }
  };

  // Grouper les messages par date
  const groupMessagesByDate = (messages: PromoGroupMessage[]) => {
    const groups: { date: string; messages: PromoGroupMessage[] }[] = [];
    let currentDate = '';

    messages.forEach((msg) => {
      const msgDate = format(new Date(msg.created_at), 'yyyy-MM-dd');
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  };

  const formatDateSeparator = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return "Aujourd'hui";
    } else if (isYesterday(date)) {
      return 'Hier';
    } else {
      return format(date, 'EEEE d MMMM', { locale: fr });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Messages area - scrollable only this part */}
      <div ref={containerRef} className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 py-8">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-200" />
            <p className="font-semibold text-gray-600 mb-1">Aucun message</p>
            <p className="text-sm text-gray-400">
              Soyez le premier à écrire dans le groupe !
            </p>
          </div>
        ) : (
          messageGroups.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-4">
                <div className="bg-white text-gray-500 text-xs font-medium px-3 py-1 rounded-full shadow-sm">
                  {formatDateSeparator(group.date)}
                </div>
              </div>

              {/* Messages du jour */}
              <div className="space-y-3">
                {group.messages.map((msg) => {
                  const isOwn = msg.sender_id === user?.id;
                  const senderName = msg.sender
                    ? `${msg.sender.first_name || ''} ${msg.sender.last_name || ''}`.trim() || 'Utilisateur'
                    : 'Utilisateur';

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex gap-2 group',
                        isOwn ? 'flex-row-reverse' : 'flex-row'
                      )}
                    >
                      {/* Avatar */}
                      {!isOwn && (
                        <Link to={`/member/${msg.sender?.id}`} className="shrink-0">
                          <Avatar
                            src={msg.sender?.avatar_url || undefined}
                            alt={senderName}
                            size="sm"
                            className="w-8 h-8"
                          />
                        </Link>
                      )}

                      {/* Message bubble */}
                      <div
                        className={cn(
                          'max-w-[75%] rounded-2xl px-4 py-2',
                          isOwn
                            ? 'bg-brand-black text-white rounded-br-md'
                            : 'bg-white text-gray-800 rounded-bl-md shadow-sm'
                        )}
                      >
                        {/* Sender name (pour les autres) */}
                        {!isOwn && (
                          <Link
                            to={`/member/${msg.sender?.id}`}
                            className="text-xs font-medium text-brand-primary hover:underline block mb-1"
                          >
                            {senderName}
                          </Link>
                        )}

                        {/* Content */}
                        <p className={cn(
                          'text-sm whitespace-pre-line break-words',
                          isOwn ? 'text-white' : 'text-gray-800'
                        )}>
                          {renderContentWithMentions(msg.content)}
                        </p>

                        {/* Time */}
                        <p className={cn(
                          'text-[10px] mt-1',
                          isOwn ? 'text-gray-400' : 'text-gray-400'
                        )}>
                          {formatMessageDate(msg.created_at)}
                        </p>
                      </div>

                      {/* Delete button (own messages only) */}
                      {isOwn && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="self-center p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Fixed at bottom with safe area */}
      <div className="bg-white border-t border-gray-100 px-3 py-2 sm:px-4 sm:py-3 safe-area-inset-bottom shrink-0">
        <MentionInput
          value={newMessage}
          onChange={setNewMessage}
          onSubmit={handleSend}
          connections={promoMembers}
          placeholder="Aa"
          loading={sending}
        />
      </div>
    </div>
  );
}
