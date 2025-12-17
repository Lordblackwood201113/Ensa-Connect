import { useState, useEffect } from 'react';
import { X, Send, CheckCircle2, Clock, Lock, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';
import type { Discussion, Reply } from '../../types';
import { formatDistanceToNow } from '../../lib/utils';

interface DiscussionDetailModalProps {
  discussion: Discussion | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function DiscussionDetailModal({ discussion, isOpen, onClose, onUpdate }: DiscussionDetailModalProps) {
  const { user } = useAuth();
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);

  useEffect(() => {
    if (discussion && isOpen) {
      fetchReplies();
    }
  }, [discussion, isOpen]);

  const fetchReplies = async () => {
    if (!discussion) return;
    
    setLoadingReplies(true);
    try {
      const { data, error } = await supabase
        .from('replies')
        .select(`
          *,
          author:profiles(id, first_name, last_name, avatar_url, promotion)
        `)
        .eq('discussion_id', discussion.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setReplies(data || []);
    } catch (error) {
      console.error('Error fetching replies:', error);
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !discussion || !newReply.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('replies')
        .insert({
          content: newReply.trim(),
          discussion_id: discussion.id,
          author_id: user.id
        });

      if (error) throw error;

      // Créer des notifications pour tous les participants
      await createNotificationsForParticipants();

      setNewReply('');
      fetchReplies();
      onUpdate();
    } catch (error) {
      console.error('Error submitting reply:', error);
      alert('Erreur lors de l\'envoi de la réponse');
    } finally {
      setLoading(false);
    }
  };

  const createNotificationsForParticipants = async () => {
    if (!user || !discussion) return;

    try {
      // Récupérer tous les participants uniques (auteur + personnes ayant répondu)
      const { data: existingReplies } = await supabase
        .from('replies')
        .select('author_id')
        .eq('discussion_id', discussion.id);

      // Collecter les IDs uniques des participants
      const participantIds = new Set<string>();
      
      // Ajouter l'auteur de la discussion
      participantIds.add(discussion.author_id);
      
      // Ajouter les auteurs des réponses
      existingReplies?.forEach(reply => {
        participantIds.add(reply.author_id);
      });

      // Retirer l'utilisateur actuel (celui qui poste la réponse)
      participantIds.delete(user.id);

      // Créer une notification pour chaque participant
      const notifications = Array.from(participantIds).map(userId => ({
        user_id: userId,
        type: 'discussion_reply',
        title: 'Nouvelle réponse',
        message: `${user.user_metadata?.first_name || 'Quelqu\'un'} a répondu à la discussion "${discussion.title.substring(0, 50)}${discussion.title.length > 50 ? '...' : ''}"`,
        link: `/discussions?open=${discussion.id}`,
        is_read: false,
        discussion_id: discussion.id,
        triggered_by_id: user.id
      }));

      if (notifications.length > 0) {
        const { error } = await supabase
          .from('notifications')
          .insert(notifications);

        if (error) {
          console.error('Error creating notifications:', error);
        }
      }
    } catch (error) {
      console.error('Error creating notifications:', error);
    }
  };

  const handleCloseDiscussion = async () => {
    if (!discussion) return;

    try {
      const { error } = await supabase
        .from('discussions')
        .update({ is_closed: true })
        .eq('id', discussion.id);

      if (error) throw error;
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error closing discussion:', error);
      alert('Erreur lors de la fermeture de la discussion');
    }
  };

  const handleDeleteDiscussion = async () => {
    if (!discussion) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette discussion ? Cette action est irréversible.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('discussions')
        .delete()
        .eq('id', discussion.id);

      if (error) throw error;
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting discussion:', error);
      alert('Erreur lors de la suppression de la discussion');
    }
  };

  if (!isOpen || !discussion) return null;

  const isAuthor = user?.id === discussion.author_id;
  const timeAgo = formatDistanceToNow(new Date(discussion.created_at));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-start sticky top-0 bg-white z-10">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-2">
              {discussion.is_closed ? (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Résolu
                </Badge>
              ) : (
                <Badge variant="neutral" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  En attente
                </Badge>
              )}
            </div>
            <h2 className="text-xl font-bold text-brand-black">
              {discussion.title}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Original Question */}
          <div className="bg-gray-50 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Avatar 
                src={discussion.author?.avatar_url || undefined} 
                alt={discussion.author?.first_name || 'Auteur'} 
                size="md" 
              />
              <div>
                <p className="font-semibold text-brand-black">
                  {discussion.author?.first_name} {discussion.author?.last_name}
                </p>
                <p className="text-xs text-gray-500">{timeAgo}</p>
              </div>
            </div>
            <p className="text-gray-700 whitespace-pre-line leading-relaxed">
              {discussion.content}
            </p>
          </div>

          {/* Replies Section */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-4">
              {replies.length} réponse{replies.length > 1 ? 's' : ''}
            </h3>

            {loadingReplies ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : replies.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                Aucune réponse pour le moment. Soyez le premier à répondre !
              </div>
            ) : (
              <div className="space-y-4">
                {replies.map((reply) => (
                  <div key={reply.id} className="bg-white border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar 
                        src={reply.author?.avatar_url || undefined} 
                        alt={reply.author?.first_name || 'Auteur'} 
                        size="sm" 
                      />
                      <div>
                        <p className="font-medium text-brand-black text-sm">
                          {reply.author?.first_name} {reply.author?.last_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(reply.created_at))}
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm whitespace-pre-line leading-relaxed pl-11">
                      {reply.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer - Reply Form or Closed Message */}
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          {discussion.is_closed ? (
            <div className="flex items-center justify-center gap-2 text-gray-500 py-2">
              <Lock className="w-4 h-4" />
              <span>Cette discussion est fermée</span>
            </div>
          ) : (
            <form onSubmit={handleSubmitReply} className="flex gap-3">
              <input
                type="text"
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                placeholder="Écrire une réponse..."
                className="flex-1 bg-white border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand-purple"
              />
              <Button type="submit" disabled={loading || !newReply.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          )}

          {/* Author Actions */}
          {isAuthor && (
            <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
              {!discussion.is_closed && (
                <Button 
                  variant="ghost" 
                  className="flex-1 text-green-600 hover:bg-green-50"
                  onClick={handleCloseDiscussion}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Marquer comme résolu
                </Button>
              )}
              <Button 
                variant="ghost" 
                className={`${discussion.is_closed ? 'flex-1' : ''} text-red-600 hover:bg-red-50`}
                onClick={handleDeleteDiscussion}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
