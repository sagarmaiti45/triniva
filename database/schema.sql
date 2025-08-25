-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'starter', 'professional', 'business')),
    tokens_remaining INTEGER DEFAULT 5000, -- Free users get 5000 tokens
    tokens_used INTEGER DEFAULT 0,
    bonus_tokens INTEGER DEFAULT 0,
    subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'expired')),
    subscription_ends_at TIMESTAMP WITH TIME ZONE,
    last_token_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    model_used TEXT,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message_count INTEGER DEFAULT 0
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model_used TEXT,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    images JSONB, -- Store image data as JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('starter', 'professional', 'business')),
    amount DECIMAL(10, 2) NOT NULL,
    tokens_granted INTEGER NOT NULL,
    payment_id TEXT UNIQUE,
    payment_gateway TEXT DEFAULT 'payu',
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'success', 'failed', 'refunded')),
    starts_at TIMESTAMP WITH TIME ZONE,
    ends_at TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Token transactions table
CREATE TABLE IF NOT EXISTS token_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('usage', 'purchase', 'bonus', 'subscription', 'refund')),
    tokens INTEGER NOT NULL, -- negative for usage, positive for credit
    description TEXT,
    model_used TEXT,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    balance_after INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Token packages table (for additional token purchases)
CREATE TABLE IF NOT EXISTS token_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    tokens INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model pricing table
CREATE TABLE IF NOT EXISTS model_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name TEXT UNIQUE NOT NULL,
    input_cost_per_million DECIMAL(10, 4),
    output_cost_per_million DECIMAL(10, 4),
    is_free BOOLEAN DEFAULT FALSE,
    supports_images BOOLEAN DEFAULT FALSE,
    max_context_tokens INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_id ON subscriptions(payment_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_pricing_updated_at BEFORE UPDATE ON model_pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to clean up old conversations (30+ days)
CREATE OR REPLACE FUNCTION cleanup_old_conversations()
RETURNS void AS $$
BEGIN
    DELETE FROM conversations
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND is_archived = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

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

CREATE POLICY "Users can create messages in own conversations" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Token transactions policies
CREATE POLICY "Users can view own token transactions" ON token_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Insert default token packages
INSERT INTO token_packages (name, tokens, price) VALUES
    ('Small Pack', 10000, 49.00),
    ('Medium Pack', 25000, 99.00),
    ('Large Pack', 50000, 179.00)
ON CONFLICT DO NOTHING;

-- Insert model pricing data
INSERT INTO model_pricing (model_name, input_cost_per_million, output_cost_per_million, is_free, supports_images) VALUES
    ('openai/gpt-oss-20b:free', 0, 0, true, true),
    ('moonshotai/kimi-k2:free', 0, 0, true, true),
    ('deepseek/deepseek-r1-0528:free', 0, 0, true, true),
    ('mistralai/mistral-medium', 2.70, 8.10, false, false),
    ('openai/gpt-4o-mini', 0.15, 0.60, false, true),
    ('qwen/qwen3-coder', 0.10, 0.10, false, false),
    ('anthropic/claude-sonnet-4', 3.00, 15.00, false, true),
    ('openai/gpt-5-mini', 2.00, 8.00, false, true),
    ('openai/gpt-5', 15.00, 60.00, false, true),
    ('anthropic/claude-3.5-haiku', 0.25, 1.25, false, true),
    ('google/gemini-2.5-flash', 0.075, 0.30, false, true),
    ('x-ai/grok-4', 10.00, 30.00, false, true),
    ('x-ai/grok-3-mini', 2.00, 6.00, false, true),
    ('meta-llama/llama-4-maverick', 0.65, 2.70, false, true),
    ('meta-llama/llama-3.3-70b-instruct', 0.70, 2.80, false, false),
    ('z-ai/glm-4.5', 1.00, 1.00, false, true),
    ('deepseek/deepseek-chat-v3-0324', 0.14, 0.28, false, true)
ON CONFLICT (model_name) DO NOTHING;