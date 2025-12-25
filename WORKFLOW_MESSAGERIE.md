# 📬 Workflow d'Implémentation - Fonctionnalité Messagerie

## Vue d'ensemble

**Objectif:** Permettre aux utilisateurs d'échanger des messages privés uniquement avec leurs connexions acceptées.

**Contrainte principale:** Seuls les utilisateurs ayant une connexion avec statut `accepted` peuvent s'envoyer des messages.

**Stack technique:**
- Frontend: React 19 + TypeScript + Tailwind CSS
- Backend: Supabase (PostgreSQL + Real-time)
- Pattern: Service layer existant (comme `connectionService`)

---

## 📋 Phases d'Implémentation

| Phase | Description | Dépendances | Fichiers |
|-------|-------------|-------------|----------|
| 1 | Base de données & Sécurité | Aucune | 1 migration SQL |
| 2 | Service Layer | Phase 1 | 2 fichiers TS |
| 3 | UI - Liste des conversations | Phase 2 | 3 composants |
| 4 | UI - Conversation individuelle | Phase 2, 3 | 4 composants |
| 5 | Intégrations & Real-time | Toutes | Modifications |
| 6 | Tests & Polish | Toutes | Tests |

---

## 🗄️ Phase 1: Base de Données & Sécurité

### 1.1 Créer la migration SQL

**Fichier:** `supabase/migrations/YYYYMMDD_create_messaging.sql`

```sql
-- ============================================
-- ENSA Connect - Messaging Feature
-- ============================================

-- Table des conversations (une par paire d'utilisateurs)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Garantit l'unicité et l'ordre des participants
  UNIQUE(participant_1, participant_2),
  CONSTRAINT ordered_participants CHECK (participant_1 < participant_2)
);

-- Index pour recherche rapide
CREATE INDEX idx_conversations_participant_1 ON conversations(participant_1);
CREATE INDEX idx_conversations_participant_2 ON conversations(participant_2);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

-- Table des messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 5000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ
);

-- Index pour les messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_unread ON messages(conversation_id, sender_id) WHERE NOT is_read;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Politique: Voir ses propres conversations
CREATE POLICY "conversations_select_own"
ON conversations FOR SELECT
USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Politique: Créer une conversation avec une connexion acceptée
CREATE POLICY "conversations_insert_connected"
ON conversations FOR INSERT
WITH CHECK (
  -- L'utilisateur doit être participant
  (auth.uid() = participant_1 OR auth.uid() = participant_2)
  AND
  -- La connexion doit exister et être acceptée
  EXISTS (
    SELECT 1 FROM connections
    WHERE id = connection_id
    AND status = 'accepted'
    AND (
      (requester_id = participant_1 AND receiver_id = participant_2)
      OR (requester_id = participant_2 AND receiver_id = participant_1)
    )
  )
);

-- Politique: Voir les messages de ses conversations
CREATE POLICY "messages_select_own_conversations"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id
    AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
  )
);

-- Politique: Envoyer des messages dans ses conversations (connexion active)
CREATE POLICY "messages_insert_own_conversations"
ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversations c
    INNER JOIN connections conn ON c.connection_id = conn.id
    WHERE c.id = conversation_id
    AND conn.status = 'accepted'
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
);

-- Politique: Marquer comme lu (mise à jour is_read)
CREATE POLICY "messages_update_read_status"
ON messages FOR UPDATE
USING (
  -- Seul le destinataire peut marquer comme lu
  sender_id != auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id
    AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
  )
)
WITH CHECK (
  -- Ne peut modifier que is_read et read_at
  sender_id != auth.uid()
);

-- ============================================
-- TRIGGERS & FONCTIONS
-- ============================================

-- Mise à jour automatique de last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_insert_update_conversation
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Notification automatique pour nouveau message
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  receiver_id UUID;
  conv_record RECORD;
BEGIN
  -- Récupérer les infos de la conversation
  SELECT * INTO conv_record FROM conversations WHERE id = NEW.conversation_id;

  -- Déterminer le destinataire
  receiver_id := CASE
    WHEN conv_record.participant_1 = NEW.sender_id THEN conv_record.participant_2
    ELSE conv_record.participant_1
  END;

  -- Récupérer le nom de l'expéditeur
  SELECT COALESCE(first_name || ' ' || last_name, email) INTO sender_name
  FROM profiles WHERE id = NEW.sender_id;

  -- Créer la notification
  INSERT INTO notifications (user_id, type, title, message, link, triggered_by_id)
  VALUES (
    receiver_id,
    'new_message',
    'Nouveau message',
    sender_name || ' vous a envoyé un message',
    '/messages/' || NEW.conversation_id,
    NEW.sender_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_message_notify
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION notify_new_message();

-- ============================================
-- ENABLE REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
```

### 1.2 Checklist Phase 1

- [ ] Créer le fichier de migration
- [ ] Exécuter la migration sur Supabase
- [ ] Vérifier les tables dans le dashboard Supabase
- [ ] Tester manuellement les politiques RLS
- [ ] Vérifier que Realtime est activé

---

## ⚙️ Phase 2: Service Layer

### 2.1 Ajouter les types

**Fichier:** `src/types/index.ts`

```typescript
// Ajouter ces types au fichier existant

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  connection_id: string;
  last_message_at: string;
  created_at: string;
}

export interface ConversationWithDetails extends Conversation {
  other_participant: Profile;
  last_message: Message | null;
  unread_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  read_at: string | null;
  sender?: Profile;
}

// Étendre le type NotificationType
// Modifier la ligne existante:
// type: 'discussion_reply' | 'connection_request' | 'connection_accepted'
// En:
// type: 'discussion_reply' | 'connection_request' | 'connection_accepted' | 'new_message'
```

### 2.2 Créer le service de messagerie

**Fichier:** `src/lib/messages.ts`

```typescript
import { supabase } from './supabase';
import { Conversation, ConversationWithDetails, Message, Profile } from '../types';
import { connectionService } from './connections';

export const messageService = {
  /**
   * Vérifie si l'utilisateur peut envoyer un message à un autre utilisateur
   * Retourne true uniquement si les deux sont connectés
   */
  async canMessageUser(userId: string, targetUserId: string): Promise<boolean> {
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
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Compter les non lus
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', userId)
            .eq('is_read', false);

          return {
            ...conv,
            other_participant: otherParticipant as Profile,
            last_message: lastMessage || null,
            unread_count: count || 0,
          };
        })
      );

      return { data: enriched, error: null };
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return { data: [], error: error as Error };
    }
  },

  /**
   * Récupère ou crée une conversation entre deux utilisateurs
   */
  async getOrCreateConversation(
    userId: string,
    otherUserId: string
  ): Promise<{ data: Conversation | null; error: Error | null }> {
    try {
      // 1. Vérifier la connexion
      const canMessage = await this.canMessageUser(userId, otherUserId);
      if (!canMessage) {
        return {
          data: null,
          error: new Error('Vous devez être connecté avec cet utilisateur pour lui envoyer un message')
        };
      }

      // 2. Ordonner les IDs pour garantir l'unicité
      const [p1, p2] = [userId, otherUserId].sort();

      // 3. Chercher une conversation existante
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .eq('participant_1', p1)
        .eq('participant_2', p2)
        .single();

      if (existing) {
        return { data: existing, error: null };
      }

      // 4. Récupérer l'ID de la connexion
      const { data: connection } = await supabase
        .from('connections')
        .select('id')
        .eq('status', 'accepted')
        .or(`and(requester_id.eq.${userId},receiver_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},receiver_id.eq.${userId})`)
        .single();

      if (!connection) {
        return { data: null, error: new Error('Connexion introuvable') };
      }

      // 5. Créer la conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          participant_1: p1,
          participant_2: p2,
          connection_id: connection.id,
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating conversation:', error);
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

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching messages:', error);
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
      return { data, error: null };
    } catch (error) {
      console.error('Error sending message:', error);
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
      console.error('Error marking messages as read:', error);
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
      console.error('Error counting unread messages:', error);
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
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching conversation:', error);
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
      return { data: profile, error: null };
    } catch (error) {
      console.error('Error fetching other participant:', error);
      return { data: null, error: error as Error };
    }
  },
};
```

### 2.3 Checklist Phase 2

- [ ] Ajouter les types dans `types/index.ts`
- [ ] Créer `src/lib/messages.ts`
- [ ] Vérifier que TypeScript compile sans erreur
- [ ] Tester manuellement `canMessageUser` avec la console

---

## 🎨 Phase 3: UI - Liste des Conversations

### 3.1 Créer la page Messages

**Fichier:** `src/pages/Messages.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Search, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { messageService } from '../lib/messages';
import { ConversationWithDetails } from '../types';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
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
              className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl border-0 focus:ring-2 focus:ring-brand-purple text-sm"
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

### 3.2 Créer ConversationCard

**Fichier:** `src/components/messages/ConversationCard.tsx`

```typescript
import { ChevronRight } from 'lucide-react';
import { ConversationWithDetails } from '../../types';
import { Avatar } from '../ui/Avatar';
import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  conversation: ConversationWithDetails;
  onClick: () => void;
}

export function ConversationCard({ conversation, onClick }: Props) {
  const { other_participant, last_message, unread_count } = conversation;
  const fullName = `${other_participant.first_name || ''} ${other_participant.last_name || ''}`.trim() || 'Utilisateur';

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: fr });
  };

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3 text-left"
    >
      {/* Avatar avec badge */}
      <div className="relative shrink-0">
        <Avatar
          src={other_participant.avatar_url}
          name={fullName}
          size="md"
        />
        {unread_count > 0 && (
          <span className="absolute -top-1 -right-1 bg-brand-purple text-white text-xs font-medium rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
            {unread_count > 99 ? '99+' : unread_count}
          </span>
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-2">
          <h3 className={cn(
            "font-medium truncate",
            unread_count > 0 && "text-gray-900"
          )}>
            {fullName}
          </h3>
          {last_message && (
            <span className="text-xs text-gray-500 shrink-0">
              {formatTime(last_message.created_at)}
            </span>
          )}
        </div>
        <p className={cn(
          "text-sm truncate mt-0.5",
          unread_count > 0 ? "text-gray-900 font-medium" : "text-gray-500"
        )}>
          {last_message?.content || "Démarrer la conversation..."}
        </p>
        {other_participant.job_title && (
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {other_participant.job_title}
            {other_participant.company && ` • ${other_participant.company}`}
          </p>
        )}
      </div>

      {/* Chevron */}
      <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
    </button>
  );
}
```

### 3.3 Créer EmptyMessages

**Fichier:** `src/components/messages/EmptyMessages.tsx`

```typescript
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Users } from 'lucide-react';
import { Button } from '../ui/Button';

export function EmptyMessages() {
  const navigate = useNavigate();

  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <MessageCircle className="w-10 h-10 text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Aucune conversation
      </h2>
      <p className="text-gray-500 mb-8 max-w-sm mx-auto">
        Vous n'avez pas encore de messages. Connectez-vous avec d'autres membres pour commencer à échanger.
      </p>
      <Button onClick={() => navigate('/directory')} className="inline-flex items-center gap-2">
        <Users className="w-4 h-4" />
        Explorer l'annuaire
      </Button>
    </div>
  );
}
```

### 3.4 Ajouter la route

**Fichier:** `src/App.tsx` - Ajouter:

```typescript
import { Messages } from './pages/Messages';

// Dans les routes protégées:
<Route path="/messages" element={<Messages />} />
```

### 3.5 Checklist Phase 3

- [ ] Créer `src/pages/Messages.tsx`
- [ ] Créer `src/components/messages/ConversationCard.tsx`
- [ ] Créer `src/components/messages/EmptyMessages.tsx`
- [ ] Ajouter la route dans `App.tsx`
- [ ] Vérifier l'affichage sur mobile et desktop

---

## 💬 Phase 4: UI - Conversation Individuelle

### 4.1 Créer la page Conversation

**Fichier:** `src/pages/Conversation.tsx`

```typescript
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { messageService } from '../lib/messages';
import { Message, Profile } from '../types';
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
          const { data } = await messageService.getMessages(conversationId, 1);
          if (data.length > 0) {
            setMessages((prev) => [...prev, data[data.length - 1]]);
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
```

### 4.2 Créer MessageBubble

**Fichier:** `src/components/messages/MessageBubble.tsx`

```typescript
import { Message, Profile } from '../../types';
import { Avatar } from '../ui/Avatar';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  senderProfile?: Profile;
}

export function MessageBubble({ message, isOwn, showAvatar, senderProfile }: Props) {
  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: fr });
  };

  return (
    <div
      className={cn(
        'flex items-end gap-2',
        isOwn ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar (seulement pour les messages reçus, groupé) */}
      {!isOwn && showAvatar && senderProfile && (
        <Avatar
          src={senderProfile.avatar_url}
          name={`${senderProfile.first_name} ${senderProfile.last_name}`}
          size="sm"
        />
      )}
      {!isOwn && !showAvatar && <div className="w-8" />}

      {/* Bulle */}
      <div
        className={cn(
          'max-w-[75%] px-4 py-2.5 rounded-2xl',
          isOwn
            ? 'bg-brand-purple text-white rounded-br-md'
            : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <span
          className={cn(
            'text-[10px] mt-1 block text-right',
            isOwn ? 'text-purple-200' : 'text-gray-400'
          )}
        >
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  );
}
```

### 4.3 Créer MessageInput

**Fichier:** `src/components/messages/MessageInput.tsx`

```typescript
import { Send, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
}

export function MessageInput({ value, onChange, onSend, sending }: Props) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="border-t bg-white p-3 pb-safe">
      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrivez votre message..."
          className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent min-h-[44px] max-h-32"
          rows={1}
        />
        <button
          onClick={onSend}
          disabled={!value.trim() || sending}
          className={cn(
            'rounded-full h-11 w-11 shrink-0 flex items-center justify-center transition-colors',
            value.trim() && !sending
              ? 'bg-brand-purple text-white hover:bg-purple-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          )}
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
```

### 4.4 Créer ConversationHeader

**Fichier:** `src/components/messages/ConversationHeader.tsx`

```typescript
import { ArrowLeft, User } from 'lucide-react';
import { Profile } from '../../types';
import { Avatar } from '../ui/Avatar';

interface Props {
  user: Profile;
  onBack: () => void;
  onViewProfile: () => void;
}

export function ConversationHeader({ user, onBack, onViewProfile }: Props) {
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Utilisateur';

  return (
    <div className="sticky top-0 z-10 bg-white border-b px-3 py-3 flex items-center gap-3">
      <button
        onClick={onBack}
        className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <Avatar src={user.avatar_url} name={fullName} size="sm" />

      <div className="flex-1 min-w-0">
        <h2 className="font-medium truncate text-sm">{fullName}</h2>
        {user.job_title && (
          <p className="text-xs text-gray-500 truncate">
            {user.job_title}
            {user.company && ` • ${user.company}`}
          </p>
        )}
      </div>

      <button
        onClick={onViewProfile}
        className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <User className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
}
```

### 4.5 Ajouter la route

**Fichier:** `src/App.tsx` - Ajouter:

```typescript
import { Conversation } from './pages/Conversation';

// Dans les routes protégées:
<Route path="/messages/:conversationId" element={<Conversation />} />
```

### 4.6 Checklist Phase 4

- [ ] Créer `src/pages/Conversation.tsx`
- [ ] Créer `src/components/messages/MessageBubble.tsx`
- [ ] Créer `src/components/messages/MessageInput.tsx`
- [ ] Créer `src/components/messages/ConversationHeader.tsx`
- [ ] Ajouter la route dans `App.tsx`
- [ ] Tester l'envoi et la réception de messages
- [ ] Vérifier le scroll automatique

---

## 🔗 Phase 5: Intégrations

### 5.1 Ajouter Messages dans la Sidebar

**Fichier:** `src/components/layout/Sidebar.tsx`

```typescript
// Ajouter l'import
import { MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { messageService } from '../../lib/messages';

// Dans le composant, ajouter le state pour les non lus
const [unreadMessages, setUnreadMessages] = useState(0);

// Ajouter le useEffect pour charger et s'abonner
useEffect(() => {
  if (!user) return;

  const fetchUnread = async () => {
    const count = await messageService.getUnreadCount(user.id);
    setUnreadMessages(count);
  };

  fetchUnread();

  // S'abonner aux nouveaux messages
  const channel = supabase
    .channel('sidebar_messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      () => fetchUnread()
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
      },
      () => fetchUnread()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user]);

// Dans les items de navigation, ajouter (après Connexions, avant Discussions):
{
  icon: MessageCircle,
  label: 'Messages',
  path: '/messages',
  badge: unreadMessages > 0 ? unreadMessages : undefined,
}
```

### 5.2 Ajouter bouton Message sur le profil

**Fichier:** `src/pages/MemberProfile.tsx`

```typescript
// Ajouter les imports
import { MessageCircle } from 'lucide-react';
import { messageService } from '../lib/messages';

// Dans le composant, ajouter le handler
const handleStartConversation = async () => {
  if (!user || !member) return;

  const { data, error } = await messageService.getOrCreateConversation(user.id, member.id);
  if (data) {
    navigate(`/messages/${data.id}`);
  } else if (error) {
    console.error('Error starting conversation:', error);
  }
};

// Dans le rendu, à côté du ConnectionButton (quand connecté):
{connectionStatus === 'connected' && (
  <Button
    variant="secondary"
    onClick={handleStartConversation}
    className="flex items-center gap-2"
  >
    <MessageCircle className="w-4 h-4" />
    <span className="hidden sm:inline">Message</span>
  </Button>
)}
```

### 5.3 Ajouter accès message sur ConnectionCard

**Fichier:** `src/components/connections/ConnectionCard.tsx`

```typescript
// Ajouter les imports
import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { messageService } from '../../lib/messages';

// Dans le composant
const navigate = useNavigate();

const handleMessage = async (e: React.MouseEvent) => {
  e.stopPropagation();
  const otherId = connection.requester_id === user?.id
    ? connection.receiver_id
    : connection.requester_id;

  const { data } = await messageService.getOrCreateConversation(user.id, otherId);
  if (data) {
    navigate(`/messages/${data.id}`);
  }
};

// Dans le rendu, ajouter un bouton message:
<button
  onClick={handleMessage}
  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
  title="Envoyer un message"
>
  <MessageCircle className="w-4 h-4 text-gray-600" />
</button>
```

### 5.4 Supporter le type de notification

**Fichier:** `src/components/notifications/NotificationDropdown.tsx`

```typescript
// Vérifier que le switch/condition gère le type 'new_message'
// Le lien devrait déjà fonctionner car il est stocké dans notification.link
```

### 5.5 Checklist Phase 5

- [ ] Ajouter Messages dans la Sidebar avec badge
- [ ] Ajouter bouton Message sur MemberProfile
- [ ] Ajouter bouton Message sur ConnectionCard
- [ ] Vérifier les notifications de type 'new_message'
- [ ] Tester le flux complet: Profil → Message → Conversation

---

## ✅ Phase 6: Tests & Polish

### 6.1 Tests fonctionnels

| Test | Description | Attendu |
|------|-------------|---------|
| Accès non-connecté | Essayer de message quelqu'un sans connexion | Erreur affichée |
| Envoi message | Envoyer un message à une connexion | Message apparaît |
| Réception temps réel | Recevoir un message de l'autre | Mise à jour instantanée |
| Badge non lus | Recevoir message sans l'ouvrir | Badge +1 dans sidebar |
| Marquer lu | Ouvrir une conversation | Badge disparaît |
| Recherche | Filtrer les conversations | Liste filtrée |
| Navigation | Tous les boutons Message | Redirige vers conversation |

### 6.2 Tests de sécurité

| Test | Description | Attendu |
|------|-------------|---------|
| RLS conversations | Requête directe en DB sans auth | Erreur 401 |
| RLS messages | Lire messages d'autres | Résultat vide |
| Envoi non autorisé | Forcer envoi via API | Erreur RLS |
| Injection | Contenu malveillant | Échappé correctement |

### 6.3 Polish UI

- [ ] Animations de transition (framer-motion optionnel)
- [ ] États de chargement skeleton
- [ ] Gestion des erreurs avec toast
- [ ] Responsive parfait mobile/desktop
- [ ] Accessibilité (aria-labels, focus states)

### 6.4 Optimisations

- [ ] Pagination des messages (load more)
- [ ] Debounce sur la recherche
- [ ] Virtualization si beaucoup de messages
- [ ] Optimistic UI pour l'envoi

---

## 📁 Résumé des Fichiers

### Nouveaux fichiers (12)

```
supabase/migrations/
  └── YYYYMMDD_create_messaging.sql

src/lib/
  └── messages.ts

src/pages/
  ├── Messages.tsx
  └── Conversation.tsx

src/components/messages/
  ├── ConversationCard.tsx
  ├── ConversationHeader.tsx
  ├── EmptyMessages.tsx
  ├── MessageBubble.tsx
  └── MessageInput.tsx
```

### Fichiers modifiés (6)

```
src/types/index.ts          # +3 interfaces, +1 type
src/App.tsx                 # +2 routes
src/components/layout/Sidebar.tsx    # +navigation item, +badge
src/pages/MemberProfile.tsx          # +bouton message
src/components/connections/ConnectionCard.tsx  # +bouton message
src/components/notifications/NotificationDropdown.tsx  # +type handling
```

---

## 🚀 Ordre d'Exécution Recommandé

1. **Phase 1** → Exécuter la migration SQL et vérifier dans Supabase
2. **Phase 2** → Créer le service et les types
3. **Phase 3** → Créer la page Messages (liste)
4. **Phase 4** → Créer la page Conversation (chat)
5. **Phase 5** → Intégrer dans le reste de l'application
6. **Phase 6** → Tester, corriger, optimiser

---

*Workflow généré le 24 décembre 2024*
*Pour ENSA Connect - Fonctionnalité Messagerie*
