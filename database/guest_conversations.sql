-- Guest Conversations Support
-- This allows non-authenticated users to have conversations

-- Guest conversations table (no user_id required)
CREATE TABLE IF NOT EXISTS guest_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL, -- Browser session identifier
    title TEXT DEFAULT 'New Chat',
    model TEXT,
    messages JSONB DEFAULT '[]'::JSONB,
    token_count INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    ip_address TEXT, -- For rate limiting
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days') -- Auto-expire after 7 days
);

-- Guest messages table
CREATE TABLE IF NOT EXISTS guest_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES guest_conversations(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model TEXT,
    credits_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_guest_conversations_session_id ON guest_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_guest_conversations_updated_at ON guest_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_guest_conversations_expires_at ON guest_conversations(expires_at);
CREATE INDEX IF NOT EXISTS idx_guest_messages_conversation_id ON guest_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_guest_messages_created_at ON guest_messages(created_at);

-- Enable Row Level Security
ALTER TABLE guest_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guest conversations
-- Allow anyone to insert/select their own conversations based on session_id
CREATE POLICY "Guest users can view own conversations" ON guest_conversations
    FOR SELECT USING (true); -- Will be filtered by session_id in app

CREATE POLICY "Guest users can create conversations" ON guest_conversations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Guest users can update own conversations" ON guest_conversations
    FOR UPDATE USING (true);

CREATE POLICY "Guest users can delete own conversations" ON guest_conversations
    FOR DELETE USING (true);

-- RLS Policies for guest messages
CREATE POLICY "Guest users can view messages" ON guest_messages
    FOR SELECT USING (true);

CREATE POLICY "Guest users can create messages" ON guest_messages
    FOR INSERT WITH CHECK (true);

-- Function to clean up expired guest conversations
CREATE OR REPLACE FUNCTION cleanup_expired_guest_conversations()
RETURNS void AS $$
BEGIN
    DELETE FROM guest_conversations
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired conversations (run daily)
-- Note: This requires pg_cron extension or manual scheduling
-- SELECT cron.schedule('cleanup-guest-conversations', '0 0 * * *', 'SELECT cleanup_expired_guest_conversations();');

-- Grant permissions
GRANT ALL ON guest_conversations TO anon, authenticated, service_role;
GRANT ALL ON guest_messages TO anon, authenticated, service_role;