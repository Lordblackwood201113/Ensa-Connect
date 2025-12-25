import { supabase } from './supabase';
import type { Profile } from '../types';

export interface PromoGroupMessage {
  id: string;
  promotion: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Profile;
}

export const promoGroupService = {
  /**
   * Récupère les messages du groupe de promotion
   */
  async getMessages(
    promotion: string,
    limit: number = 50,
    before?: string
  ): Promise<{ data: PromoGroupMessage[]; error: Error | null }> {
    try {
      let query = supabase
        .from('promo_group_messages')
        .select(`
          *,
          sender:profiles!promo_group_messages_sender_id_fkey(
            id, first_name, last_name, avatar_url, promotion
          )
        `)
        .eq('promotion', promotion)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (before) {
        query = query.lt('created_at', before);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { data: (data || []) as PromoGroupMessage[], error: null };
    } catch (error) {
      console.error('Error fetching promo group messages:', error);
      return { data: [], error: error as Error };
    }
  },

  /**
   * Envoie un message dans le groupe de promotion
   */
  async sendMessage(
    promotion: string,
    senderId: string,
    content: string
  ): Promise<{ data: PromoGroupMessage | null; error: Error | null }> {
    try {
      const trimmedContent = content.trim();
      if (!trimmedContent) {
        return { data: null, error: new Error('Le message ne peut pas être vide') };
      }

      if (trimmedContent.length > 5000) {
        return { data: null, error: new Error('Le message est trop long (max 5000 caractères)') };
      }

      const { data, error } = await supabase
        .from('promo_group_messages')
        .insert({
          promotion,
          sender_id: senderId,
          content: trimmedContent,
        })
        .select(`
          *,
          sender:profiles!promo_group_messages_sender_id_fkey(
            id, first_name, last_name, avatar_url, promotion
          )
        `)
        .single();

      if (error) throw error;
      return { data: data as PromoGroupMessage, error: null };
    } catch (error) {
      console.error('Error sending promo group message:', error);
      return { data: null, error: error as Error };
    }
  },

  /**
   * Récupère tous les membres d'une promotion pour les mentions
   */
  async getPromoMembers(promotion: string): Promise<Profile[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, promotion')
        .eq('promotion', promotion);

      if (error) throw error;
      return (data || []) as Profile[];
    } catch (error) {
      console.error('Error fetching promo members:', error);
      return [];
    }
  },

  /**
   * Crée des notifications pour les utilisateurs mentionnés dans le groupe
   */
  async createMentionNotifications(
    mentionedUserIds: string[],
    senderId: string,
    senderName: string,
    promotion: string,
    messageContent: string
  ): Promise<void> {
    if (mentionedUserIds.length === 0) return;

    try {
      // Ne pas notifier l'expéditeur s'il se mentionne lui-même
      const usersToNotify = mentionedUserIds.filter((id) => id !== senderId);

      if (usersToNotify.length === 0) return;

      // Tronquer le contenu pour la notification
      const truncatedContent = messageContent.length > 100
        ? messageContent.substring(0, 100) + '...'
        : messageContent;

      const notifications = usersToNotify.map((userId) => ({
        user_id: userId,
        type: 'promo_group_mention',
        title: 'Mention dans le groupe',
        message: `${senderName} vous a mentionné dans le groupe ${promotion}: "${truncatedContent}"`,
        link: `/promo?tab=groupe`,
        is_read: false,
        triggered_by_id: senderId,
      }));

      const { error } = await supabase.from('notifications').insert(notifications);

      if (error) {
        console.error('Error creating promo group mention notifications:', error);
      }
    } catch (error) {
      console.error('Error in createMentionNotifications:', error);
    }
  },

  /**
   * Supprime un message (seulement le sien)
   */
  async deleteMessage(messageId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('promo_group_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error deleting promo group message:', error);
      return { error: error as Error };
    }
  },
};
