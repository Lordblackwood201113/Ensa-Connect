import { supabase } from './supabase';
import type { Profile } from '../types';

/**
 * Service pour gérer les mentions dans les discussions
 */
export const mentionService = {
  /**
   * Récupère les profils des connexions de l'utilisateur pour les suggestions de mentions
   */
  async getConnectionsForMentions(userId: string): Promise<Profile[]> {
    try {
      const { data: connections, error } = await supabase
        .from('connections')
        .select(`
          requester:profiles!connections_requester_id_fkey(id, first_name, last_name, avatar_url, promotion),
          receiver:profiles!connections_receiver_id_fkey(id, first_name, last_name, avatar_url, promotion)
        `)
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'accepted');

      if (error) throw error;
      if (!connections) return [];

      // Extraire les profils des connexions (exclure l'utilisateur actuel)
      // Note: Supabase retourne les relations comme des objets uniques (pas des tableaux)
      const profiles: Profile[] = [];
      connections.forEach((conn) => {
        const requester = conn.requester as unknown as Profile | null;
        const receiver = conn.receiver as unknown as Profile | null;

        if (requester && requester.id !== userId) {
          profiles.push(requester);
        }
        if (receiver && receiver.id !== userId) {
          profiles.push(receiver);
        }
      });

      // Retirer les doublons
      const uniqueProfiles = profiles.filter(
        (profile, index, self) =>
          index === self.findIndex((p) => p.id === profile.id)
      );

      return uniqueProfiles;
    } catch (error) {
      console.error('Error fetching connections for mentions:', error);
      return [];
    }
  },

  /**
   * Trouve les IDs des utilisateurs mentionnés à partir de leurs noms
   */
  async findMentionedUserIds(
    mentionedNames: string[],
    availableConnections: Profile[]
  ): Promise<string[]> {
    if (mentionedNames.length === 0) return [];

    const mentionedIds: string[] = [];

    for (const name of mentionedNames) {
      // Normaliser le nom pour la comparaison
      const normalizedMention = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // Chercher dans les connexions disponibles
      const matchingProfile = availableConnections.find((profile) => {
        const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
        const normalizedProfile = fullName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return normalizedProfile === normalizedMention;
      });

      if (matchingProfile) {
        mentionedIds.push(matchingProfile.id);
      }
    }

    return [...new Set(mentionedIds)]; // Retirer les doublons
  },

  /**
   * Crée des notifications pour les utilisateurs mentionnés
   */
  async createMentionNotifications(
    mentionedUserIds: string[],
    senderId: string,
    senderName: string,
    discussionId: string,
    discussionTitle: string,
    replyContent: string
  ): Promise<void> {
    if (mentionedUserIds.length === 0) return;

    try {
      // Ne pas notifier l'expéditeur s'il se mentionne lui-même
      const usersToNotify = mentionedUserIds.filter((id) => id !== senderId);

      if (usersToNotify.length === 0) return;

      // Tronquer le contenu pour la notification
      const truncatedContent = replyContent.length > 100
        ? replyContent.substring(0, 100) + '...'
        : replyContent;

      // Tronquer le titre
      const truncatedTitle = discussionTitle.length > 50
        ? discussionTitle.substring(0, 50) + '...'
        : discussionTitle;

      const notifications = usersToNotify.map((userId) => ({
        user_id: userId,
        type: 'discussion_mention',
        title: 'Vous avez été mentionné',
        message: `${senderName} vous a mentionné dans "${truncatedTitle}": "${truncatedContent}"`,
        link: `/discussions?open=${discussionId}`,
        is_read: false,
        discussion_id: discussionId,
        triggered_by_id: senderId,
      }));

      const { error } = await supabase.from('notifications').insert(notifications);

      if (error) {
        console.error('Error creating mention notifications:', error);
      }
    } catch (error) {
      console.error('Error in createMentionNotifications:', error);
    }
  },
};
