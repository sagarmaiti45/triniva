-- Triniva AI Platform Complete Database Schema
-- Run this in Supabase SQL Editor after deleting all auth users

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS usage_logs CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- User profiles table (extends Supabase auth.users)
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'pro', 'business')),
    token_balance INTEGER DEFAULT 5000,
    total_tokens_used BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table with proper chat management
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'New Chat',
    model TEXT,
    messages JSONB DEFAULT '[]'::JSONB,
    token_count INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table for better message management
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model TEXT,
    credits_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::JSONB
);

-- Orders table for Razorpay orders
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'created' CHECK (status IN ('created', 'processing', 'completed', 'failed')),
    payment_id TEXT,
    razorpay_signature TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Subscriptions table for subscription history
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL,
    order_id TEXT REFERENCES orders(order_id),
    payment_id TEXT,
    amount INTEGER NOT NULL,
    credits_granted INTEGER NOT NULL,
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking table
CREATE TABLE usage_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    total_tokens INTEGER NOT NULL,
    credits_used INTEGER NOT NULL,
    cost DECIMAL(10, 6),
    chat_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX idx_usage_logs_chat_id ON usage_logs(chat_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX idx_conversations_token_count ON conversations(token_count);
CREATE INDEX idx_conversations_composite ON conversations(user_id, updated_at DESC, token_count);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

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
CREATE POLICY "Users can view messages from own conversations" ON messages
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create messages in own conversations" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own messages" ON messages
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages" ON messages
    FOR DELETE USING (auth.uid() = user_id);

-- Orders table policies
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders" ON orders
    FOR UPDATE USING (auth.uid() = user_id);

-- Subscriptions table policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage subscriptions" ON subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Usage logs policies
CREATE POLICY "Users can view own usage" ON usage_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON usage_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, email, full_name, token_balance, subscription_tier)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.email),
        5000,
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

-- Function to auto-cleanup old conversations based on user plan
CREATE OR REPLACE FUNCTION cleanup_old_conversations()
RETURNS TRIGGER AS $$
DECLARE
    user_plan TEXT;
    chat_limit INTEGER;
    chat_count INTEGER;
BEGIN
    -- Get user's plan from user_profiles
    SELECT subscription_tier INTO user_plan
    FROM user_profiles
    WHERE user_id = NEW.user_id;
    
    -- If no profile exists, default to free
    IF user_plan IS NULL THEN
        user_plan := 'free';
    END IF;
    
    -- Set chat limit based on plan
    CASE user_plan
        WHEN 'free' THEN chat_limit := 7;
        WHEN 'starter' THEN chat_limit := 30;
        WHEN 'pro' THEN chat_limit := 30;
        WHEN 'business' THEN chat_limit := 30;
        ELSE chat_limit := 7; -- Default to free limit
    END CASE;
    
    -- Count current conversations for this user
    SELECT COUNT(*) INTO chat_count
    FROM conversations
    WHERE user_id = NEW.user_id
    AND is_archived = FALSE; -- Don't count archived chats
    
    -- If over limit, delete oldest conversations
    IF chat_count > chat_limit THEN
        DELETE FROM conversations
        WHERE id IN (
            SELECT id FROM conversations
            WHERE user_id = NEW.user_id
            AND is_archived = FALSE
            ORDER BY updated_at ASC
            LIMIT (chat_count - chat_limit)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-cleanup
DROP TRIGGER IF EXISTS cleanup_old_conversations_trigger ON conversations;
CREATE TRIGGER cleanup_old_conversations_trigger
    AFTER INSERT ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_old_conversations();

-- Function to update token count when messages change
CREATE OR REPLACE FUNCTION update_conversation_token_count()
RETURNS TRIGGER AS $$
DECLARE
    total_tokens INTEGER;
BEGIN
    -- Calculate approximate token count from messages JSONB
    -- Using rough estimate: 1 token ≈ 4 characters
    SELECT COALESCE(
        SUM(
            CASE 
                WHEN jsonb_typeof(msg->'content') = 'string' THEN 
                    LENGTH(msg->>'content') / 4
                ELSE 
                    LENGTH(msg::text) / 4
            END
        )::INTEGER,
        0
    ) INTO total_tokens
    FROM jsonb_array_elements(NEW.messages) AS msg;
    
    NEW.token_count := total_tokens;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update token count
DROP TRIGGER IF EXISTS update_token_count_trigger ON conversations;
CREATE TRIGGER update_token_count_trigger
    BEFORE UPDATE OF messages ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_token_count();

-- Function to update conversation timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update conversation timestamp when new message is added
DROP TRIGGER IF EXISTS update_conversation_on_message ON messages;
CREATE TRIGGER update_conversation_on_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

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

-- View for user chat stats
CREATE OR REPLACE VIEW user_chat_stats AS
SELECT 
    u.id as user_id,
    up.subscription_tier,
    COUNT(DISTINCT c.id) as total_chats,
    COUNT(DISTINCT CASE WHEN c.created_at >= NOW() - INTERVAL '7 days' THEN c.id END) as chats_last_7_days,
    COUNT(DISTINCT CASE WHEN c.created_at >= NOW() - INTERVAL '30 days' THEN c.id END) as chats_last_30_days,
    COALESCE(SUM(c.token_count), 0) as total_tokens,
    COALESCE(AVG(c.token_count), 0) as avg_tokens_per_chat,
    MAX(c.updated_at) as last_chat_date
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN conversations c ON u.id = c.user_id
WHERE u.id = auth.uid()
GROUP BY u.id, up.subscription_tier;

-- Grant permissions for views and tables
GRANT SELECT ON user_stats TO authenticated;
GRANT SELECT ON user_chat_stats TO authenticated;
GRANT ALL ON user_profiles TO service_role;
GRANT ALL ON usage_logs TO service_role;
GRANT ALL ON subscriptions TO service_role;
GRANT ALL ON conversations TO service_role;
GRANT ALL ON messages TO service_role;

-- Ensure user_profiles has default values for all authenticated users
INSERT INTO user_profiles (user_id, email, subscription_tier, token_balance)
SELECT 
    id,
    email,
    'free',
    5000
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- Update any existing conversations to calculate their token count
UPDATE conversations 
SET token_count = (
    SELECT COALESCE(
        SUM(
            CASE 
                WHEN jsonb_typeof(msg->'content') = 'string' THEN 
                    LENGTH(msg->>'content') / 4
                ELSE 
                    LENGTH(msg::text) / 4
            END
        )::INTEGER,
        0
    )
    FROM jsonb_array_elements(messages) AS msg
)
WHERE token_count = 0 OR token_count IS NULL;

-- Success message
SELECT 'Database schema created successfully!' as message;