-- =============================================
-- MIGRATION: Admin Features & Join Requests
-- =============================================

-- 1. Add is_super_user column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_super_user BOOLEAN DEFAULT FALSE;

-- 2. Create join_requests table
CREATE TABLE IF NOT EXISTS join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    promotion TEXT NOT NULL,
    city TEXT NOT NULL,
    linkedin_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS on join_requests
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

-- 4. Policies for join_requests
-- Anyone can insert (submit a join request)
CREATE POLICY "Anyone can submit join request" ON join_requests
    FOR INSERT WITH CHECK (true);

-- Only super users can view all requests
CREATE POLICY "Super users can view all join requests" ON join_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_super_user = true
        )
    );

-- Only super users can update requests
CREATE POLICY "Super users can update join requests" ON join_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_super_user = true
        )
    );

-- 5. Create admin_messages table for mass messaging
CREATE TABLE IF NOT EXISTS admin_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES profiles(id) NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    recipient_filter JSONB DEFAULT '{}', -- Can filter by promotion, city, etc.
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable RLS on admin_messages
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

-- Only super users can manage admin messages
CREATE POLICY "Super users can manage admin messages" ON admin_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_super_user = true
        )
    );

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON join_requests(status);
CREATE INDEX IF NOT EXISTS idx_join_requests_email ON join_requests(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_super_user ON profiles(is_super_user);

-- 7b. Allow super users to update any profile (for promoting/demoting users)
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update own profile or super users can update any" ON profiles
    FOR UPDATE USING (
        id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_super_user = true
        )
    );

-- 7c. Allow super users to delete any user profile
CREATE POLICY "Super users can delete any profile" ON profiles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_super_user = true
        )
    );

-- 7d. Allow super users to create conversations with anyone (bypass connection check)
DROP POLICY IF EXISTS "Participants can insert conversations" ON conversations;
CREATE POLICY "Participants or super users can insert conversations" ON conversations
    FOR INSERT WITH CHECK (
        -- User is a participant
        (participant_1 = auth.uid() OR participant_2 = auth.uid())
        OR
        -- Or user is a super user
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_super_user = true
        )
    );

-- 7e. Allow super users to view all conversations
DROP POLICY IF EXISTS "Participants can view their conversations" ON conversations;
CREATE POLICY "Participants or super users can view conversations" ON conversations
    FOR SELECT USING (
        participant_1 = auth.uid() OR
        participant_2 = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_super_user = true
        )
    );

-- 7f. Allow super users to send messages in any conversation
DROP POLICY IF EXISTS "Participants can send messages" ON messages;
CREATE POLICY "Participants or super users can send messages" ON messages
    FOR INSERT WITH CHECK (
        -- Sender is the authenticated user and is a participant
        (sender_id = auth.uid() AND EXISTS (
            SELECT 1 FROM conversations
            WHERE id = conversation_id
            AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
        ))
        OR
        -- Or sender is a super user
        (sender_id = auth.uid() AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_super_user = true
        ))
    );

-- 8. Update function to allow super users to delete any job/discussion
-- This requires updating RLS policies on jobs and discussions tables

-- Allow super users to delete any job
DROP POLICY IF EXISTS "Users can delete their own jobs" ON jobs;
CREATE POLICY "Users can delete own jobs or super users can delete any" ON jobs
    FOR DELETE USING (
        poster_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_super_user = true
        )
    );

-- Allow super users to delete any discussion
DROP POLICY IF EXISTS "Users can delete their own discussions" ON discussions;
CREATE POLICY "Users can delete own discussions or super users can delete any" ON discussions
    FOR DELETE USING (
        author_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_super_user = true
        )
    );

-- 9. Function to create user from approved join request
CREATE OR REPLACE FUNCTION create_user_from_join_request(
    request_id UUID,
    temp_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    req RECORD;
    new_user_id UUID;
    result JSON;
BEGIN
    -- Get the join request
    SELECT * INTO req FROM join_requests WHERE id = request_id AND status = 'approved';

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Request not found or not approved');
    END IF;

    -- Note: User creation via auth.users requires Supabase Edge Function
    -- This function just returns the request data for the Edge Function to use
    RETURN json_build_object(
        'success', true,
        'email', req.email,
        'full_name', req.full_name,
        'promotion', req.promotion,
        'city', req.city,
        'linkedin_url', req.linkedin_url
    );
END;
$$;
