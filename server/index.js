import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { authenticateToken } from './middleware/auth.js';
import subscriptionRoutes from './routes/subscription.js';
import { getModelPricing, calculateCreditsUsed, canUseModel } from './config/modelPricing.js';
import { supabase } from './lib/supabase.js';
import { countTokens } from './utils/tokenCounter.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/subscription', subscriptionRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Get user info and credits
app.get('/api/user', authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
            
        if (error || !user) {
            return res.json({
                plan: 'free',
                credits: 5000,
                email: req.userEmail
            });
        }
        
        res.json({
            plan: user.plan,
            credits: user.credits,
            email: user.email,
            fullName: user.full_name
        });
        
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

// Chat endpoint with credit deduction
app.post('/api/chat', authenticateToken, async (req, res) => {
    try {
        const { messages, model, stream = false } = req.body;
        const userId = req.userId;
        
        // Get user data
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
            
        const userPlan = user?.plan || 'free';
        const userCredits = user?.credits || 5000;
        
        // Check if user can use this model
        if (!canUseModel(userPlan, model)) {
            return res.status(403).json({ 
                error: 'This model is not available in your plan. Please upgrade to access premium models.' 
            });
        }
        
        // Get model pricing
        const modelPricing = getModelPricing(model);
        
        // Estimate tokens (rough estimate)
        const inputTokens = countTokens(JSON.stringify(messages));
        const estimatedCredits = calculateCreditsUsed(model, inputTokens, 500); // Estimate 500 output tokens
        
        // Check if user has enough credits
        if (userCredits < estimatedCredits) {
            return res.status(402).json({ 
                error: 'Insufficient credits. Please upgrade your plan.',
                creditsNeeded: estimatedCredits,
                creditsAvailable: userCredits
            });
        }
        
        // Make request to OpenRouter
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://triniva.com',
                'X-Title': 'Triniva AI',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages,
                stream
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            console.error('OpenRouter error:', error);
            return res.status(response.status).json({ error: 'Failed to get AI response' });
        }
        
        const data = await response.json();
        
        // Calculate actual credits used
        const outputTokens = countTokens(data.choices[0].message.content);
        const actualCreditsUsed = calculateCreditsUsed(model, inputTokens, outputTokens);
        
        // Deduct credits
        const newCredits = Math.max(0, userCredits - actualCreditsUsed);
        
        if (user) {
            await supabase
                .from('users')
                .update({ credits: newCredits })
                .eq('id', userId);
                
            // Log usage
            await supabase
                .from('usage_logs')
                .insert({
                    user_id: userId,
                    model_id: model,
                    input_tokens: inputTokens,
                    output_tokens: outputTokens,
                    credits_used: actualCreditsUsed,
                    chat_id: req.body.chatId || null
                });
        }
        
        // Return response with usage info
        res.json({
            ...data,
            usage: {
                input_tokens: inputTokens,
                output_tokens: outputTokens,
                credits_used: actualCreditsUsed,
                credits_remaining: newCredits
            }
        });
        
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process chat request' });
    }
});

// Save chat history
app.post('/api/chat/save', authenticateToken, async (req, res) => {
    try {
        const { chatId, title, messages, model } = req.body;
        const userId = req.userId;
        
        const { error } = await supabase
            .from('chat_history')
            .upsert({
                user_id: userId,
                chat_id: chatId,
                title: title || 'Untitled Chat',
                messages,
                model_id: model,
                updated_at: new Date().toISOString()
            });
            
        if (error) {
            console.error('Save chat error:', error);
            return res.status(500).json({ error: 'Failed to save chat' });
        }
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Save chat error:', error);
        res.status(500).json({ error: 'Failed to save chat' });
    }
});

// Get chat history
app.get('/api/chat/history', authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        
        const { data: chats, error } = await supabase
            .from('chat_history')
            .select('chat_id, title, updated_at, model_id')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(50);
            
        if (error) {
            console.error('Get history error:', error);
            return res.status(500).json({ error: 'Failed to get chat history' });
        }
        
        res.json(chats || []);
        
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Failed to get chat history' });
    }
});

// Load specific chat
app.get('/api/chat/:chatId', authenticateToken, async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.userId;
        
        const { data: chat, error } = await supabase
            .from('chat_history')
            .select('*')
            .eq('user_id', userId)
            .eq('chat_id', chatId)
            .single();
            
        if (error || !chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }
        
        res.json(chat);
        
    } catch (error) {
        console.error('Load chat error:', error);
        res.status(500).json({ error: 'Failed to load chat' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});