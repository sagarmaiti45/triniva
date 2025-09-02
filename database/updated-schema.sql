-- Updated Triniva AI Platform Database Schema
-- This schema supports proper chat management with UUID-based chat IDs

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS usage_logs CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- User profiles table (extends Supabase auth.users)
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'pro', 'business')),
    token_balance INTEGER DEFAULT 1000, -- Credits for free tier
    total_tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table with UUID primary key
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT, -- Deprecated, kept for backward compatibility
    title TEXT DEFAULT 'New Chat',
    model TEXT, -- Store the model used for this conversation
    messages JSONB DEFAULT '[]'::jsonb, -- Store messages as JSONB for flexibility
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table for better message management
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL, -- Can be TEXT or JSON string for multimodal content
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage logs table with credits tracking
CREATE TABLE usage_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    chat_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    total_tokens INTEGER NOT NULL,
    credits_used INTEGER NOT NULL, -- Credits consumed based on model multiplier
    cost DECIMAL(10, 6), -- Actual API cost in USD
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_chat_id ON usage_logs(chat_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Conversations policies
CREATE POLICY "Users can view own conversations" ON conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON conversations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON conversations
    FOR DELETE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages in own conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages in own conversations" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND conversations.user_id = auth.uid()
        )
    );

-- Usage logs policies
CREATE POLICY "Users can view own usage logs" ON usage_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, email, full_name, token_balance, subscription_tier)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.email),
        1000, -- Free tier gets 1000 credits
        'free'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to deduct credits from user balance
CREATE OR REPLACE FUNCTION public.deduct_credits(
    user_id_param UUID,
    credits_to_deduct INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance INTEGER;
BEGIN
    -- Get current balance with row lock
    SELECT token_balance INTO current_balance
    FROM user_profiles
    WHERE user_id = user_id_param
    FOR UPDATE;
    
    -- Check if user has enough credits
    IF current_balance >= credits_to_deduct THEN
        -- Deduct credits
        UPDATE user_profiles
        SET token_balance = token_balance - credits_to_deduct,
            total_tokens_used = total_tokens_used + credits_to_deduct,
            updated_at = NOW()
        WHERE user_id = user_id_param;
        
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add credits after purchase
CREATE OR REPLACE FUNCTION public.add_credits(
    user_id_param UUID,
    credits_to_add INTEGER,
    new_tier TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    IF new_tier IS NOT NULL THEN
        UPDATE user_profiles
        SET token_balance = token_balance + credits_to_add,
            subscription_tier = new_tier,
            updated_at = NOW()
        WHERE user_id = user_id_param;
    ELSE
        UPDATE user_profiles
        SET token_balance = token_balance + credits_to_add,
            updated_at = NOW()
        WHERE user_id = user_id_param;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for user statistics
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    up.user_id,
    up.email,
    up.full_name,
    up.subscription_tier,
    up.token_balance as credits_remaining,
    up.total_tokens_used as total_credits_used,
    COUNT(DISTINCT c.id) as total_conversations,
    COUNT(DISTINCT m.id) as total_messages,
    COALESCE(SUM(ul.credits_used) FILTER (WHERE ul.created_at >= NOW() - INTERVAL '30 days'), 0) as credits_used_30d,
    COALESCE(SUM(ul.credits_used) FILTER (WHERE ul.created_at >= NOW() - INTERVAL '7 days'), 0) as credits_used_7d,
    COALESCE(SUM(ul.credits_used) FILTER (WHERE ul.created_at >= NOW() - INTERVAL '24 hours'), 0) as credits_used_24h
FROM user_profiles up
LEFT JOIN conversations c ON c.user_id = up.user_id
LEFT JOIN messages m ON m.conversation_id = c.id
LEFT JOIN usage_logs ul ON ul.user_id = up.user_id
WHERE up.user_id = auth.uid()
GROUP BY up.user_id, up.email, up.full_name, up.subscription_tier, up.token_balance, up.total_tokens_used;

-- Grant permissions for the view
GRANT SELECT ON user_stats TO authenticated;

-- Function to clean up old guest conversations (older than 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_conversations()
RETURNS void AS $$
BEGIN
    DELETE FROM conversations
    WHERE user_id IS NULL 
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT 'Updated database schema created successfully!' as message;