-- Migration for comprehensive chat management system
-- Run this in your Supabase SQL editor

-- 1. Alter conversations table to add missing columns
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS messages JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS token_count INTEGER DEFAULT 0;

-- 2. Add index for session_id for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);

-- 3. Add index for token_count to quickly find chats near limit
CREATE INDEX IF NOT EXISTS idx_conversations_token_count ON conversations(token_count);

-- 4. Create or update user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'pro', 'business')),
    token_balance INTEGER DEFAULT 5000,
    total_tokens_used BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create usage_logs table for tracking token usage
CREATE TABLE IF NOT EXISTS usage_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    total_tokens INTEGER NOT NULL,
    credits_used INTEGER NOT NULL,
    cost DECIMAL(10, 6),
    chat_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Add indexes for usage_logs
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_chat_id ON usage_logs(chat_id);

-- 7. Create subscriptions table if not exists
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    amount_paid DECIMAL(10, 2),
    credits_granted INTEGER,
    payment_method TEXT,
    payment_id TEXT,
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Add indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON subscriptions(expires_at);

-- 9. Enable RLS for new tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert user profiles" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 11. Create RLS policies for usage_logs
CREATE POLICY "Users can view their own usage logs" ON usage_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage logs" ON usage_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 12. Create RLS policies for subscriptions
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage subscriptions" ON subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- 13. Create function to auto-cleanup old conversations based on user plan
CREATE OR REPLACE FUNCTION cleanup_old_conversations()
RETURNS TRIGGER AS $$
DECLARE
    user_plan TEXT;
    chat_limit INTEGER;
    chat_count INTEGER;
BEGIN
    -- Get user's plan
    SELECT subscription_tier INTO user_plan
    FROM user_profiles
    WHERE user_id = NEW.user_id;
    
    -- Set chat limit based on plan
    CASE user_plan
        WHEN 'free' THEN chat_limit := 7;
        WHEN 'starter' THEN chat_limit := 30;
        WHEN 'pro' THEN chat_limit := 30;
        WHEN 'business' THEN chat_limit := 30;
        ELSE chat_limit := 7; -- Default to free limit
    END CASE;
    
    -- Count current conversations
    SELECT COUNT(*) INTO chat_count
    FROM conversations
    WHERE user_id = NEW.user_id;
    
    -- If over limit, delete oldest conversations
    IF chat_count > chat_limit THEN
        DELETE FROM conversations
        WHERE id IN (
            SELECT id FROM conversations
            WHERE user_id = NEW.user_id
            ORDER BY updated_at ASC
            LIMIT (chat_count - chat_limit)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. Create trigger for auto-cleanup
DROP TRIGGER IF EXISTS cleanup_old_conversations_trigger ON conversations;
CREATE TRIGGER cleanup_old_conversations_trigger
    AFTER INSERT ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_old_conversations();

-- 15. Create function to update token count
CREATE OR REPLACE FUNCTION update_conversation_token_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update token_count based on messages JSONB
    NEW.token_count := COALESCE(
        (SELECT SUM(LENGTH(value::text) / 4) -- Rough token estimate
         FROM jsonb_array_elements(NEW.messages) AS value),
        0
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 16. Create trigger to auto-update token count
DROP TRIGGER IF EXISTS update_token_count_trigger ON conversations;
CREATE TRIGGER update_token_count_trigger
    BEFORE UPDATE OF messages ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_token_count();

-- 17. Create view for user statistics
CREATE OR REPLACE VIEW user_chat_stats AS
SELECT 
    u.user_id,
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
GROUP BY u.id, up.subscription_tier;

-- 18. Grant necessary permissions for service role
GRANT ALL ON user_profiles TO service_role;
GRANT ALL ON usage_logs TO service_role;
GRANT ALL ON subscriptions TO service_role;
GRANT ALL ON conversations TO service_role;
GRANT ALL ON messages TO service_role;

-- 19. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_created ON usage_logs(user_id, created_at DESC);

-- 20. Add composite index for efficient chat history queries
CREATE INDEX IF NOT EXISTS idx_conversations_composite ON conversations(user_id, updated_at DESC, token_count);

-- Migration complete!
-- After running this migration, your Supabase database will be ready for the chat management system