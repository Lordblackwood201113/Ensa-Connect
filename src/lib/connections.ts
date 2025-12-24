import { supabase } from './supabase';
import type { Connection } from '../types';

export const connectionService = {
  /**
   * Récupérer toutes les connexions acceptées de l'utilisateur
   */
  async getMyConnections(userId: string) {
    const { data, error } = await supabase
      .from('connections')
      .select(`
        *,
        requester:profiles!connections_requester_id_fkey(*),
        receiver:profiles!connections_receiver_id_fkey(*)
      `)
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted')
      .order('updated_at', { ascending: false });

    return { data: data as Connection[] | null, error };
  },

  /**
   * Récupérer les demandes de connexion en attente (reçues)
   */
  async getPendingRequests(userId: string) {
    const { data, error } = await supabase
      .from('connections')
      .select(`
        *,
        requester:profiles!connections_requester_id_fkey(*)
      `)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    return { data: data as Connection[] | null, error };
  },

  /**
   * Récupérer les demandes envoyées (en attente)
   */
  async getSentRequests(userId: string) {
    const { data, error } = await supabase
      .from('connections')
      .select(`
        *,
        receiver:profiles!connections_receiver_id_fkey(*)
      `)
      .eq('requester_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    return { data: data as Connection[] | null, error };
  },

  /**
   * Envoyer une demande de connexion
   */
  async sendRequest(requesterId: string, receiverId: string) {
    const { data, error } = await supabase
      .from('connections')
      .insert({
        requester_id: requesterId,
        receiver_id: receiverId,
        status: 'pending'
      })
      .select()
      .single();

    return { data: data as Connection | null, error };
  },

  /**
   * Répondre à une demande de connexion
   */
  async respondToRequest(connectionId: string, status: 'accepted' | 'rejected') {
    const { data, error } = await supabase
      .from('connections')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)
      .select()
      .single();

    return { data: data as Connection | null, error };
  },

  /**
   * Vérifier le statut de connexion entre deux utilisateurs
   */
  async getConnectionStatus(userId1: string, userId2: string): Promise<{
    data: Connection | null;
    error: unknown;
    status: 'none' | 'pending_sent' | 'pending_received' | 'connected';
  }> {
    const { data, error } = await supabase
      .from('connections')
      .select('*')
      .or(`and(requester_id.eq.${userId1},receiver_id.eq.${userId2}),and(requester_id.eq.${userId2},receiver_id.eq.${userId1})`)
      .maybeSingle();

    let status: 'none' | 'pending_sent' | 'pending_received' | 'connected' = 'none';

    if (data) {
      if (data.status === 'accepted') {
        status = 'connected';
      } else if (data.status === 'pending') {
        status = data.requester_id === userId1 ? 'pending_sent' : 'pending_received';
      }
    }

    return { data: data as Connection | null, error, status };
  },

  /**
   * Supprimer une connexion
   */
  async removeConnection(connectionId: string) {
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId);

    return { error };
  },

  /**
   * Compter les connexions d'un utilisateur
   */
  async getConnectionsCount(userId: string) {
    const { count, error } = await supabase
      .from('connections')
      .select('*', { count: 'exact', head: true })
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted');

    return { count: count || 0, error };
  },

  /**
   * Compter les demandes en attente
   */
  async getPendingCount(userId: string) {
    const { count, error } = await supabase
      .from('connections')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('status', 'pending');

    return { count: count || 0, error };
  }
};
