-- MINIMAL Migration - Only adds what's missing for chat management
-- Run this in Supabase SQL Editor

-- 1. Add token_count column to conversations table (if not exists)
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS token_count INTEGER DEFAULT 0;

-- 2. Add index for token_count for performance
CREATE INDEX IF NOT EXISTS idx_conversations_token_count ON conversations(token_count);

-- 3. Add composite index for efficient chat history queries
CREATE INDEX IF NOT EXISTS idx_conversations_composite ON conversations(user_id, updated_at DESC, token_count);

-- 4. Create function to auto-cleanup old conversations based on user plan
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

-- 5. Create trigger for auto-cleanup (drop if exists first)
DROP TRIGGER IF EXISTS cleanup_old_conversations_trigger ON conversations;
CREATE TRIGGER cleanup_old_conversations_trigger
    AFTER INSERT ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_old_conversations();

-- 6. Create function to update token count when messages change
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

-- 7. Create trigger to auto-update token count
DROP TRIGGER IF EXISTS update_token_count_trigger ON conversations;
CREATE TRIGGER update_token_count_trigger
    BEFORE UPDATE OF messages ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_token_count();

-- 8. Ensure user_profiles has default values for all authenticated users
INSERT INTO user_profiles (user_id, email, subscription_tier, token_balance)
SELECT 
    id,
    email,
    'free',
    5000
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- 9. Update any existing conversations to calculate their token count
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

-- Migration complete! 
-- This adds only the missing pieces needed for the chat management system