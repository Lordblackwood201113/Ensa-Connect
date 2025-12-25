-- ============================================
-- ENSA Connect - Add promo_group_message notification type
-- Migration: Update notification type constraint
-- ============================================

-- Cette migration met à jour la contrainte sur le type de notification
-- pour inclure le nouveau type 'promo_group_message'

-- Option 1: Si vous utilisez un ENUM, ajoutez la nouvelle valeur
-- ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'promo_group_message';

-- Option 2: Si vous utilisez une contrainte CHECK, mettez-la à jour
-- D'abord, supprimer l'ancienne contrainte (si elle existe)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Ajouter la nouvelle contrainte avec tous les types supportés
ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'discussion_reply',
  'connection_request',
  'connection_accepted',
  'new_message',
  'discussion_mention',
  'promo_group_mention',
  'promo_group_message'
));

-- Note: Si la table n'a pas de contrainte, cette migration créera la première
-- Si une erreur survient, essayez de vérifier le type de contrainte existant
-- dans le dashboard Supabase: Database > Tables > notifications > Constraints
