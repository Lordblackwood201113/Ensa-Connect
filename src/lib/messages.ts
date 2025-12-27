import { supabase } from './supabase';
import type { Conversation, ConversationWithDetails, Message, Profile } from '../types';
import { connectionService } from './connections';
import { createLogger } from './logger';

const log = createLogger('Messages');

export const messageService = {
  /**
   * Vérifie si l'utilisateur est un super user
   */
  async isSuperUser(userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('profiles')
      .select('is_super_user')
      .eq('id', userId)
      .single();
    return data?.is_super_user === true;
  },

  /**
   * Vérifie si l'utilisateur peut envoyer un message à un autre utilisateur
   * Retourne true si les deux sont connectés OU si l'utilisateur est super user
   */
  async canMessageUser(userId: string, targetUserId: string): Promise<boolean> {
    // Super users can message anyone
    const isSuperUser = await this.isSuperUser(userId);
    if (isSuperUser) return true;

    const { status } = await connectionService.getConnectionStatus(userId, targetUserId);
    return status === 'connected';
  },

  /**
   * Récupère toutes les conversations de l'utilisateur avec les détails
   */
  async getConversations(userId: string): Promise<{ data: ConversationWithDetails[]; error: Error | null }> {
    try {
      // Récupérer les conversations
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participant_1_profile:profiles!conversations_participant_1_fkey(*),
          participant_2_profile:profiles!conversations_participant_2_fkey(*)
        `)
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      if (!conversations) return { data: [], error: null };

      // Enrichir avec last_message et unread_count
      const enriched = await Promise.all(
        conversations.map(async (conv) => {
          // Déterminer l'autre participant
          const otherParticipant = conv.participant_1 === userId
            ? conv.participant_2_profile
            : conv.participant_1_profile;

          // Récupérer le dernier message
          const { data: lastMessages } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const lastMessage = lastMessages && lastMessages.length > 0 ? lastMessages[0] : null;

          // Compter les non lus
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', userId)
            .eq('is_read', false);

          return {
            id: conv.id,
            participant_1: conv.participant_1,
            participant_2: conv.participant_2,
            connection_id: conv.connection_id,
            last_message_at: conv.last_message_at,
            created_at: conv.created_at,
            other_participant: otherParticipant as Profile,
            last_message: lastMessage as Message | null,
            unread_count: count || 0,
          };
        })
      );

      return { data: enriched, error: null };
    } catch (error) {
      log.error('Erreur récupération conversations', error);
      return { data: [], error: error as Error };
    }
  },

  /**
   * Récupère ou crée une conversation entre deux utilisateurs
   * Les super users peuvent créer des conversations sans connexion préalable
   */
  async getOrCreateConversation(
    userId: string,
    otherUserId: string
  ): Promise<{ data: Conversation | null; error: Error | null }> {
    try {
      // 1. Vérifier si c'est un super user ou s'ils sont connectés
      const isSuperUser = await this.isSuperUser(userId);

      if (!isSuperUser) {
        const canMessage = await this.canMessageUser(userId, otherUserId);
        if (!canMessage) {
          return {
            data: null,
            error: new Error('Vous devez être connecté avec cet utilisateur pour lui envoyer un message')
          };
        }
      }

      // 2. Ordonner les IDs pour garantir l'unicité
      const [p1, p2] = [userId, otherUserId].sort();

      // 3. Chercher une conversation existante
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .eq('participant_1', p1)
        .eq('participant_2', p2)
        .maybeSingle();

      if (existing) {
        return { data: existing as Conversation, error: null };
      }

      // 4. Récupérer l'ID de la connexion (optionnel pour super users)
      let connectionId = null;
      const { data: connection } = await supabase
        .from('connections')
        .select('id')
        .eq('status', 'accepted')
        .or(`and(requester_id.eq.${userId},receiver_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},receiver_id.eq.${userId})`)
        .maybeSingle();

      if (connection) {
        connectionId = connection.id;
      } else if (!isSuperUser) {
        return { data: null, error: new Error('Connexion introuvable') };
      }

      // 5. Créer la conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          participant_1: p1,
          participant_2: p2,
          connection_id: connectionId,
        })
        .select()
        .single();

      // Si erreur de contrainte unique, la conversation existe déjà - la récupérer
      if (error && error.code === '23505') {
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('*')
          .eq('participant_1', p1)
          .eq('participant_2', p2)
          .single();

        if (existingConv) {
          return { data: existingConv as Conversation, error: null };
        }
      }

      if (error) throw error;
      return { data: data as Conversation, error: null };
    } catch (error) {
      log.error('Erreur création conversation', error);
      return { data: null, error: error as Error };
    }
  },

  /**
   * Récupère les messages d'une conversation (pagination)
   */
  async getMessages(
    conversationId: string,
    limit: number = 50,
    before?: string
  ): Promise<{ data: Message[]; error: Error | null }> {
    try {
      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(*)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (before) {
        query = query.lt('created_at', before);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { data: (data || []) as Message[], error: null };
    } catch (error) {
      log.error('Erreur récupération messages', error);
      return { data: [], error: error as Error };
    }
  },

  /**
   * Envoie un message
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string
  ): Promise<{ data: Message | null; error: Error | null }> {
    try {
      const trimmedContent = content.trim();
      if (!trimmedContent) {
        return { data: null, error: new Error('Le message ne peut pas être vide') };
      }

      if (trimmedContent.length > 5000) {
        return { data: null, error: new Error('Le message est trop long (max 5000 caractères)') };
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: trimmedContent,
        })
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(*)
        `)
        .single();

      if (error) throw error;
      return { data: data as Message, error: null };
    } catch (error) {
      log.error('Erreur envoi message', error);
      return { data: null, error: error as Error };
    }
  },

  /**
   * Marque tous les messages d'une conversation comme lus
   */
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .eq('is_read', false);
    } catch (error) {
      log.error('Erreur marquage messages lus', error);
    }
  },

  /**
   * Compte le nombre total de messages non lus
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);

      if (!conversations || conversations.length === 0) return 0;

      const conversationIds = conversations.map((c) => c.id);

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .neq('sender_id', userId)
        .eq('is_read', false);

      return count || 0;
    } catch (error) {
      log.error('Erreur comptage messages non lus', error);
      return 0;
    }
  },

  /**
   * Récupère les détails d'une conversation
   */
  async getConversation(conversationId: string): Promise<{ data: Conversation | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      return { data: data as Conversation, error: null };
    } catch (error) {
      log.error('Erreur récupération conversation', error);
      return { data: null, error: error as Error };
    }
  },

  /**
   * Récupère l'autre participant d'une conversation
   */
  async getOtherParticipant(
    conversationId: string,
    currentUserId: string
  ): Promise<{ data: Profile | null; error: Error | null }> {
    try {
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('participant_1, participant_2')
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;
      if (!conv) return { data: null, error: new Error('Conversation introuvable') };

      const otherId = conv.participant_1 === currentUserId ? conv.participant_2 : conv.participant_1;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherId)
        .single();

      if (profileError) throw profileError;
      return { data: profile as Profile, error: null };
    } catch (error) {
      log.error('Erreur récupération autre participant', error);
      return { data: null, error: error as Error };
    }
  },

  /**
   * Supprime une conversation et tous ses messages
   * Seuls les participants peuvent supprimer leur conversation
   */
  async deleteConversation(conversationId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      log.error('Erreur suppression conversation', error);
      return { error: error as Error };
    }
  },

  /**
   * Supprime toutes les conversations d'un utilisateur
   */
  async deleteAllConversations(userId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      log.error('Erreur suppression toutes conversations', error);
      return { error: error as Error };
    }
  },
};
