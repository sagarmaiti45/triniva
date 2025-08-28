-- Triniva AI Platform Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS chat_history CASCADE;
DROP TABLE IF EXISTS usage_logs CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'business')),
    credits INTEGER DEFAULT 5000,
    total_credits_purchased INTEGER DEFAULT 0,
    plan_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table for Razorpay orders
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    credits_used INTEGER NOT NULL,
    chat_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat history table
CREATE TABLE chat_history (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    chat_id TEXT NOT NULL,
    title TEXT,
    messages JSONB NOT NULL,
    model_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, chat_id)
);

-- Create indexes for performance
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX idx_chat_history_chat_id ON chat_history(chat_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

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

-- Usage logs policies
CREATE POLICY "Users can view own usage" ON usage_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON usage_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Chat history policies
CREATE POLICY "Users can view own chats" ON chat_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chats" ON chat_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chats" ON chat_history
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chats" ON chat_history
    FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically create user record on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, credits, plan)
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

-- Trigger to create user record on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update user credits (for backend use)
CREATE OR REPLACE FUNCTION public.deduct_credits(
    user_id_param UUID,
    credits_to_deduct INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    current_credits INTEGER;
BEGIN
    -- Get current credits
    SELECT credits INTO current_credits
    FROM users
    WHERE id = user_id_param;
    
    -- Check if user has enough credits
    IF current_credits >= credits_to_deduct THEN
        -- Deduct credits
        UPDATE users
        SET credits = credits - credits_to_deduct,
            updated_at = NOW()
        WHERE id = user_id_param;
        
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add credits after successful payment
CREATE OR REPLACE FUNCTION public.add_credits(
    user_id_param UUID,
    credits_to_add INTEGER,
    plan_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update user credits and plan if provided
    IF plan_name IS NOT NULL THEN
        UPDATE users
        SET credits = credits + credits_to_add,
            plan = plan_name,
            plan_expires_at = NOW() + INTERVAL '30 days',
            total_credits_purchased = total_credits_purchased + credits_to_add,
            updated_at = NOW()
        WHERE id = user_id_param;
    ELSE
        UPDATE users
        SET credits = credits + credits_to_add,
            total_credits_purchased = total_credits_purchased + credits_to_add,
            updated_at = NOW()
        WHERE id = user_id_param;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for dashboard statistics
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.plan,
    u.credits,
    u.plan_expires_at,
    COUNT(DISTINCT ch.chat_id) as total_chats,
    COUNT(ul.id) as total_requests,
    COALESCE(SUM(ul.credits_used), 0) as total_credits_used,
    COALESCE(SUM(ul.credits_used) FILTER (WHERE ul.created_at >= NOW() - INTERVAL '30 days'), 0) as credits_used_30d,
    COALESCE(SUM(ul.credits_used) FILTER (WHERE ul.created_at >= NOW() - INTERVAL '7 days'), 0) as credits_used_7d,
    COALESCE(SUM(ul.credits_used) FILTER (WHERE ul.created_at >= NOW() - INTERVAL '24 hours'), 0) as credits_used_24h
FROM users u
LEFT JOIN chat_history ch ON ch.user_id = u.id
LEFT JOIN usage_logs ul ON ul.user_id = u.id
WHERE u.id = auth.uid()
GROUP BY u.id, u.email, u.full_name, u.plan, u.credits, u.plan_expires_at;

-- Grant permissions for the view
GRANT SELECT ON user_stats TO authenticated;

-- Sample data for testing (optional - remove in production)
-- This will only work if you have a test user
/*
INSERT INTO users (id, email, full_name, plan, credits) 
VALUES 
    ('YOUR_USER_ID', 'test@example.com', 'Test User', 'free', 5000)
ON CONFLICT (id) DO NOTHING;
*/

-- Success message
SELECT 'Database schema created successfully!' as message;