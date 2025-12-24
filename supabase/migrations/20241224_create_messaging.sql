-- ============================================
-- ENSA Connect - Messaging Feature
-- Migration: Create conversations and messages tables
-- ============================================

-- Table des conversations (une par paire d'utilisateurs)
CREATE TABLE IF NOT EXISTS conversations (
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
CREATE INDEX IF NOT EXISTS idx_conversations_participant_1 ON conversations(participant_1);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_2 ON conversations(participant_2);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

-- Table des messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 5000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ
);

-- Index pour les messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, sender_id) WHERE NOT is_read;

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

-- Politique: Supprimer ses propres conversations
CREATE POLICY "conversations_delete_own"
ON conversations FOR DELETE
USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

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

DROP TRIGGER IF EXISTS on_message_insert_update_conversation ON messages;
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

DROP TRIGGER IF EXISTS on_new_message_notify ON messages;
CREATE TRIGGER on_new_message_notify
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION notify_new_message();

-- ============================================
-- ENABLE REALTIME
-- ============================================

-- Note: Execute these in Supabase Dashboard if needed
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
