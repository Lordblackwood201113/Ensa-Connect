-- ============================================
-- ENSA Connect - Promo Group Chat Feature
-- Migration: Create promo_group_messages table
-- ============================================

-- Table des messages de groupe de promotion
CREATE TABLE IF NOT EXISTS promo_group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion VARCHAR(50) NOT NULL,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 5000),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les messages de groupe
CREATE INDEX IF NOT EXISTS idx_promo_group_messages_promotion ON promo_group_messages(promotion, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_promo_group_messages_sender ON promo_group_messages(sender_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE promo_group_messages ENABLE ROW LEVEL SECURITY;

-- Politique: Voir les messages de sa promotion
CREATE POLICY "promo_group_messages_select_own_promo"
ON promo_group_messages FOR SELECT
USING (
  promotion = (
    SELECT promotion FROM profiles WHERE id = auth.uid()
  )
);

-- Politique: Envoyer des messages dans sa promotion
CREATE POLICY "promo_group_messages_insert_own_promo"
ON promo_group_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND promotion = (
    SELECT promotion FROM profiles WHERE id = auth.uid()
  )
);

-- Politique: Supprimer ses propres messages
CREATE POLICY "promo_group_messages_delete_own"
ON promo_group_messages FOR DELETE
USING (sender_id = auth.uid());

-- ============================================
-- TRIGGERS & FONCTIONS
-- ============================================

-- Notification automatique pour mention dans le groupe
-- Note: Les mentions sont gérées côté client pour éviter la complexité

-- ============================================
-- ENABLE REALTIME
-- ============================================

-- Note: Execute in Supabase Dashboard if needed
-- ALTER PUBLICATION supabase_realtime ADD TABLE promo_group_messages;
