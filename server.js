import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { sql, supabase } from './server/config/database.js';
import { verifyToken, checkTokenBalance } from './server/middleware/auth.js';
import { countTokens } from './server/utils/tokenCounter.js';
import { modelPricing, calculateCreditsConsumed, canUseModel } from './server/config/modelPricing.js';
import { ChatManager } from './server/utils/chatManager.js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const conversations = new Map();
const chatManager = new ChatManager();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Routes for pages without .html extension
app.get('/plans', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'plans.html'));
});

app.get('/important-info', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'important-info.html'));
});

app.get('/privacy-policy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'privacy-policy.html'));
});

app.get('/terms-conditions', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'terms-conditions.html'));
});

app.get('/refund-policy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'refund-policy.html'));
});

app.get('/about-us', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'about-us.html'));
});

app.get('/contact-us', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact-us.html'));
});

// Chat routing with unique IDs
app.get('/chat/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// New chat creation endpoint
app.post('/api/chat/new', verifyToken, async (req, res) => {
    try {
        const chatId = uuidv4();
        const userId = req.userId;
        const isGuest = req.isGuest;
        
        if (!isGuest && userId) {
            // Create new conversation in database for authenticated users
            await sql`
                INSERT INTO conversations (id, user_id, session_id, title, messages, created_at, updated_at)
                VALUES (${chatId}, ${userId}, ${chatId}, 'New Chat', '[]'::jsonb, NOW(), NOW())
            `;
        }
        
        res.json({ chatId, url: `/chat/${chatId}` });
    } catch (error) {
        console.error('Error creating new chat:', error);
        res.status(500).json({ error: 'Failed to create new chat' });
    }
});

// Enhanced chat endpoint with proper session management and token limits
app.post('/api/chat', verifyToken, checkTokenBalance, async (req, res) => {
    const { message, model, chatId, images = [] } = req.body;
    const userId = req.userId;
    const isGuest = req.isGuest;
    const userPlan = req.subscriptionTier || 'free';

    console.log('[Chat API] Request received:', { 
        hasMessage: !!message, 
        model, 
        chatId, 
        userId: userId || 'guest', 
        userPlan,
        hasImages: images.length > 0
    });

    if ((!message && images.length === 0) || !model || !chatId) {
        console.log('[Chat API] Missing required fields');
        return res.status(400).json({ error: 'Message/images, model, and chatId are required' });
    }
    
    // Check if user can use the selected model
    if (!canUseModel(userPlan, model)) {
        console.log('[Chat API] Model not available for user plan:', userPlan);
        return res.status(403).json({ 
            error: 'Model not available', 
            message: `The ${model} model is not available in your ${userPlan} plan. Please upgrade to access this model.`
        });
    }

    let conversation = null;
    let currentMessages = [];
    
    try {
        if (!isGuest && userId) {
            // For authenticated users, use ChatManager
            conversation = await chatManager.getConversation(chatId, userId);
            
            if (!conversation) {
                // Create new conversation
                const messageText = typeof message === 'string' ? message : 
                    (images.length > 0 ? "What's in this image?" : 'New Chat');
                conversation = await chatManager.createNewChat(userId, userPlan, messageText);
                console.log('[Chat API] Created new chat:', conversation.chatId);
            }
            
            currentMessages = conversation.messages || [];
            console.log('[Chat API] Loaded conversation with', currentMessages.length, 'messages');
            
            // Check if adding this message would exceed token limit
            const messageText = typeof message === 'string' ? message : 
                JSON.stringify(images.length > 0 ? [{ type: 'text', text: message || "What's in this image?" }, ...images] : message);
                
            if (chatManager.wouldExceedTokenLimit(currentMessages, messageText)) {
                console.log('[Chat API] Token limit would be exceeded');
                return res.status(413).json({ 
                    error: 'Token limit exceeded', 
                    message: 'This chat has reached the maximum token limit. Please start a new chat to continue.',
                    tokenCount: conversation.tokenCount,
                    maxTokens: chatManager.maxTokensPerChat,
                    suggestNewChat: true
                });
            }
        } else {
            // For guests, use simple in-memory storage
            if (!conversations.has(chatId)) {
                conversations.set(chatId, []);
            }
            currentMessages = conversations.get(chatId);
            console.log('[Chat API] Guest conversation with', currentMessages.length, 'messages');
        }

        // Build the new user message
        let userMessage;
        if (images.length > 0) {
            userMessage = {
                role: 'user',
                content: [
                    { type: 'text', text: message || "What's in this image?" },
                    ...images
                ]
            };
        } else {
            userMessage = { role: 'user', content: message };
        }

        // Add user message to conversation
        const updatedMessages = [...currentMessages, userMessage];
        console.log('[Chat API] Total messages after user input:', updatedMessages.length);

        // Set up streaming response
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        console.log('[Chat API] Making request to OpenRouter with', updatedMessages.length, 'messages');

        // Make API request to OpenRouter
        const apiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.NODE_ENV === 'production' ? 'https://triniva.com' : 'http://localhost:3000',
                'X-Title': 'Triniva AI Chat Platform'
            },
            body: JSON.stringify({
                model: model,
                messages: updatedMessages,
                stream: true,
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            console.error('[Chat API] OpenRouter API error:', apiResponse.status, errorBody);
            throw new Error(`OpenRouter API error: ${apiResponse.status} - ${errorBody}`);
        }

        console.log('[Chat API] OpenRouter API response OK, starting stream');

        const reader = apiResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let assistantMessage = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            while (true) {
                const lineEnd = buffer.indexOf('\n');
                if (lineEnd === -1) break;

                const line = buffer.slice(0, lineEnd).trim();
                buffer = buffer.slice(lineEnd + 1);

                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    
                    if (data === '[DONE]') {
                        console.log('[Chat API] Stream completed, assistant message length:', assistantMessage.length);
                        res.write(`data: [DONE]\n\n`);
                        
                        // Add assistant message to conversation
                        const finalMessages = [...updatedMessages, { role: 'assistant', content: assistantMessage }];
                        
                        // Save conversation for authenticated users
                        if (!isGuest && userId) {
                            try {
                                await chatManager.updateConversation(chatId, finalMessages);
                                
                                // Calculate and record usage
                                const inputTokens = countTokens(JSON.stringify(updatedMessages));
                                const outputTokens = countTokens(assistantMessage);
                                const totalTokens = inputTokens + outputTokens;
                                const creditsUsed = calculateCreditsConsumed(totalTokens, model);
                                const cost = calculateCost(model, inputTokens, outputTokens);
                                
                                // Deduct credits from user balance
                                await sql`
                                    UPDATE user_profiles
                                    SET token_balance = token_balance - ${creditsUsed},
                                        total_tokens_used = total_tokens_used + ${totalTokens}
                                    WHERE user_id = ${userId}
                                `;
                                
                                // Record usage
                                await sql`
                                    INSERT INTO usage_logs 
                                    (user_id, model, input_tokens, output_tokens, total_tokens, credits_used, cost, chat_id)
                                    VALUES (${userId}, ${model}, ${inputTokens}, ${outputTokens}, ${totalTokens}, ${creditsUsed}, ${cost}, ${chatId})
                                `;
                                
                                console.log('[Chat API] Saved conversation and usage for user:', userId);
                            } catch (err) {
                                console.error('[Chat API] Error saving conversation:', err);
                            }
                        } else {
                            // Update guest conversation in memory
                            conversations.set(chatId, finalMessages);
                        }
                        
                        break;
                    }

                    if (data.trim() && !data.startsWith(':')) {
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content;
                            
                            if (content) {
                                assistantMessage += content;
                                res.write(`data: ${JSON.stringify({ content })}\n\n`);
                            }
                        } catch (e) {
                            console.error('[Chat API] Parse error:', e);
                        }
                    }
                }
            }
        }

        res.end();
    } catch (error) {
        console.error('[Chat API] Error:', error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});

// Get specific conversation
app.get('/api/chat/:chatId', verifyToken, async (req, res) => {
    const { chatId } = req.params;
    const userId = req.userId;
    const isGuest = req.isGuest;
    
    try {
        if (!isGuest && userId) {
            // Get conversation from database
            const result = await sql`
                SELECT c.*, 
                       array_agg(
                           json_build_object(
                               'id', m.id,
                               'role', m.role,
                               'content', m.content,
                               'created_at', m.created_at
                           ) ORDER BY m.created_at
                       ) as messages
                FROM conversations c
                LEFT JOIN messages m ON m.conversation_id = c.id
                WHERE c.id = ${chatId} AND c.user_id = ${userId}
                GROUP BY c.id
            `;
            
            if (result.length === 0) {
                return res.status(404).json({ error: 'Conversation not found' });
            }
            
            res.json({ conversation: result[0] });
        } else {
            // Get from memory for guests
            const history = conversations.get(chatId) || [];
            res.json({ 
                conversation: {
                    id: chatId,
                    messages: history,
                    title: 'Guest Chat'
                }
            });
        }
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({ error: 'Failed to fetch conversation' });
    }
});

// Delete conversation
app.delete('/api/chat/:chatId', verifyToken, async (req, res) => {
    const { chatId } = req.params;
    const userId = req.userId;
    
    if (req.isGuest) {
        conversations.delete(chatId);
        return res.json({ success: true });
    }
    
    try {
        await sql`
            DELETE FROM conversations
            WHERE id = ${chatId} AND user_id = ${userId}
        `;
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting conversation:', error);
        res.status(500).json({ error: 'Failed to delete conversation' });
    }
});

// Update conversation title
app.patch('/api/chat/:chatId', verifyToken, async (req, res) => {
    const { chatId } = req.params;
    const { title } = req.body;
    const userId = req.userId;
    
    if (req.isGuest) {
        return res.status(403).json({ error: 'Guests cannot rename conversations' });
    }
    
    try {
        await sql`
            UPDATE conversations
            SET title = ${title}, updated_at = NOW()
            WHERE id = ${chatId} AND user_id = ${userId}
        `;
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating conversation:', error);
        res.status(500).json({ error: 'Failed to update conversation' });
    }
});

// Helper function to calculate cost based on model pricing
function calculateCost(model, inputTokens, outputTokens) {
    const pricing = modelPricing[model] || { input: 0, output: 0 };
    return (inputTokens * pricing.input / 1000000) + (outputTokens * pricing.output / 1000000);
}

// Get recent chats with proper limits based on user plan
app.get('/api/conversations', verifyToken, async (req, res) => {
    try {
        if (req.isGuest) {
            return res.json({ conversations: [] });
        }

        const userPlan = req.subscriptionTier || 'free';
        const recentChats = await chatManager.getRecentChats(req.userId, chatManager.getUserChatLimit(userPlan));
        
        res.json({ 
            conversations: recentChats,
            userPlan,
            chatLimit: chatManager.getUserChatLimit(userPlan)
        });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// Get chat info including token usage
app.get('/api/chat/:chatId/info', verifyToken, async (req, res) => {
    const { chatId } = req.params;
    
    if (req.isGuest) {
        const guestMessages = conversations.get(chatId) || [];
        return res.json({
            chatId,
            title: 'Guest Chat',
            tokenCount: chatManager.calculateConversationTokens(guestMessages),
            maxTokens: chatManager.maxTokensPerChat,
            messageCount: guestMessages.length,
            isNearLimit: false,
            exceededLimit: false
        });
    }

    try {
        const conversation = await chatManager.getConversation(chatId, req.userId);
        
        if (!conversation) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        res.json({
            chatId: conversation.id,
            title: conversation.title,
            tokenCount: conversation.tokenCount,
            maxTokens: chatManager.maxTokensPerChat,
            messageCount: conversation.messages.length,
            isNearLimit: conversation.isNearLimit,
            exceededLimit: conversation.exceededLimit,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt
        });
    } catch (error) {
        console.error('Error fetching chat info:', error);
        res.status(500).json({ error: 'Failed to fetch chat info' });
    }
});

app.get('/api/conversation/:id', verifyToken, async (req, res) => {
    try {
        const conversation = await sql`
            SELECT * FROM conversations
            WHERE id = ${req.params.id} AND user_id = ${req.userId}
            LIMIT 1
        `;
        
        if (conversation.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        
        const messages = await sql`
            SELECT * FROM messages
            WHERE conversation_id = ${req.params.id}
            ORDER BY created_at ASC
        `;
        
        res.json({ 
            conversation: conversation[0],
            messages 
        });
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({ error: 'Failed to fetch conversation' });
    }
});

app.get('/api/user/profile', verifyToken, async (req, res) => {
    if (req.isGuest) {
        return res.json({ 
            isGuest: true,
            tokenBalance: 0,
            credits: 0,
            plan: 'guest'
        });
    }
    
    try {
        const profile = await sql`
            SELECT 
                up.*,
                COUNT(DISTINCT c.id) as total_chats,
                COALESCE(SUM(ul.credits_used), 0) as total_credits_used
            FROM user_profiles up
            LEFT JOIN conversations c ON c.user_id = up.user_id
            LEFT JOIN usage_logs ul ON ul.user_id = up.user_id
            WHERE up.user_id = ${req.userId}
            GROUP BY up.user_id, up.subscription_tier, up.token_balance, up.total_tokens_used, up.created_at, up.updated_at
            LIMIT 1
        `;
        
        if (profile.length === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        
        res.json({ profile: profile[0] });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Get user usage statistics
app.get('/api/user/usage', verifyToken, async (req, res) => {
    if (req.isGuest) {
        return res.json({ usage: [] });
    }
    
    try {
        const usage = await sql`
            SELECT 
                DATE(created_at) as date,
                model,
                SUM(input_tokens) as input_tokens,
                SUM(output_tokens) as output_tokens,
                SUM(credits_used) as credits_used,
                COUNT(*) as requests
            FROM usage_logs
            WHERE user_id = ${req.userId}
            AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(created_at), model
            ORDER BY date DESC, credits_used DESC
        `;
        
        res.json({ usage });
    } catch (error) {
        console.error('Error fetching usage:', error);
        res.status(500).json({ error: 'Failed to fetch usage' });
    }
});

// Get available models for user's plan
app.get('/api/user/models', verifyToken, async (req, res) => {
    const userPlan = req.subscriptionTier || (req.isGuest ? 'guest' : 'free');
    
    const availableModels = Object.entries(modelPricing).filter(([modelId, model]) => {
        return canUseModel(userPlan, modelId);
    }).map(([modelId, model]) => ({
        id: modelId,
        ...model,
        available: true
    }));
    
    const restrictedModels = Object.entries(modelPricing).filter(([modelId, model]) => {
        return !canUseModel(userPlan, modelId);
    }).map(([modelId, model]) => ({
        id: modelId,
        ...model,
        available: false
    }));
    
    res.json({ 
        availableModels,
        restrictedModels,
        userPlan
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});