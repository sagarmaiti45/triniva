import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { sql, supabase } from './server/config/database.js';
import { verifyToken, checkTokenBalance } from './server/middleware/auth.js';
import { countTokens } from './server/utils/tokenCounter.js';
import { modelPricing } from './server/config/modelPricing.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const conversations = new Map();

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

// Apply auth middleware to chat endpoint
app.post('/api/chat', verifyToken, checkTokenBalance, async (req, res) => {
    const { message, model, sessionId, images = [] } = req.body;
    const userId = req.userId; // From auth middleware
    const isGuest = req.isGuest; // From auth middleware

    if ((!message && images.length === 0) || !model) {
        return res.status(400).json({ error: 'Message/images and model are required' });
    }

    let conversation = [];
    let conversationId = null;
    
    // For authenticated users, load or create conversation from database
    if (!isGuest && userId) {
        try {
            // Check if conversation exists in database
            const existingConv = await sql`
                SELECT id, messages 
                FROM conversations 
                WHERE user_id = ${userId} 
                AND session_id = ${sessionId}
                LIMIT 1
            `;
            
            if (existingConv.length > 0) {
                conversationId = existingConv[0].id;
                conversation = existingConv[0].messages || [];
            } else {
                // Create new conversation in database
                const newConv = await sql`
                    INSERT INTO conversations (user_id, session_id, title, messages)
                    VALUES (${userId}, ${sessionId}, 'New Chat', '[]'::jsonb)
                    RETURNING id
                `;
                conversationId = newConv[0].id;
            }
        } catch (dbError) {
            console.error('Database error:', dbError);
            // Fall back to in-memory storage
            if (!conversations.has(sessionId)) {
                conversations.set(sessionId, []);
            }
            conversation = conversations.get(sessionId);
        }
    } else {
        // For guests, use in-memory storage
        if (!conversations.has(sessionId)) {
            conversations.set(sessionId, []);
        }
        conversation = conversations.get(sessionId);
    }
    
    // Build message content based on whether images are included
    if (images.length > 0) {
        // Create content array for multimodal message
        const messageContent = [
            { type: 'text', text: message || "What's in this image?" }
        ];
        // Add images to content
        images.forEach(img => {
            messageContent.push(img);
        });
        const userMessage = { role: 'user', content: messageContent };
        conversation.push(userMessage);
        
        // Save to database for authenticated users
        if (!isGuest && userId && conversationId) {
            try {
                await sql`
                    INSERT INTO messages (conversation_id, role, content)
                    VALUES (${conversationId}, 'user', ${JSON.stringify(messageContent)})
                `;
            } catch (err) {
                console.error('Error saving user message:', err);
            }
        }
    } else {
        // Simple text message
        const userMessage = { role: 'user', content: message };
        conversation.push(userMessage);
        
        // Save to database for authenticated users
        if (!isGuest && userId && conversationId) {
            try {
                await sql`
                    INSERT INTO messages (conversation_id, role, content)
                    VALUES (${conversationId}, 'user', ${message})
                `;
            } catch (err) {
                console.error('Error saving user message:', err);
            }
        }
    }

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'AI Chat Platform'
            },
            body: JSON.stringify({
                model: model,
                messages: conversation,
                stream: true,
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body.getReader();
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
                        res.write(`data: [DONE]\n\n`);
                        conversation.push({ role: 'assistant', content: assistantMessage });
                        
                        // Save assistant message and update conversation
                        if (!isGuest && userId && conversationId) {
                            try {
                                // Save assistant message
                                await sql`
                                    INSERT INTO messages (conversation_id, role, content)
                                    VALUES (${conversationId}, 'assistant', ${assistantMessage})
                                `;
                                
                                // Update conversation with latest messages
                                await sql`
                                    UPDATE conversations
                                    SET messages = ${JSON.stringify(conversation)}::jsonb,
                                        updated_at = NOW()
                                    WHERE id = ${conversationId}
                                `;
                                
                                // Calculate and deduct tokens
                                const inputTokens = countTokens(JSON.stringify(conversation));
                                const outputTokens = countTokens(assistantMessage);
                                const totalTokens = inputTokens + outputTokens;
                                const cost = calculateCost(model, inputTokens, outputTokens);
                                
                                // Deduct tokens from user balance
                                await sql`
                                    UPDATE user_profiles
                                    SET token_balance = token_balance - ${totalTokens},
                                        total_tokens_used = total_tokens_used + ${totalTokens}
                                    WHERE user_id = ${userId}
                                `;
                                
                                // Record usage
                                await sql`
                                    INSERT INTO usage_logs 
                                    (user_id, model, input_tokens, output_tokens, total_tokens, cost)
                                    VALUES (${userId}, ${model}, ${inputTokens}, ${outputTokens}, ${totalTokens}, ${cost})
                                `;
                            } catch (err) {
                                console.error('Error saving to database:', err);
                            }
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
                            console.error('Parse error:', e);
                        }
                    }
                }
            }
        }

        res.end();
    } catch (error) {
        console.error('Error:', error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});

app.get('/api/session', (req, res) => {
    const sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    res.json({ sessionId });
});

app.get('/api/history/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const history = conversations.get(sessionId) || [];
    res.json({ history });
});

// Helper function to calculate cost based on model pricing
function calculateCost(model, inputTokens, outputTokens) {
    const pricing = modelPricing[model] || { input: 0, output: 0 };
    return (inputTokens * pricing.input / 1000000) + (outputTokens * pricing.output / 1000000);
}

// New endpoints for authenticated features
app.get('/api/conversations', verifyToken, async (req, res) => {
    try {
        const conversations = await sql`
            SELECT id, title, created_at, updated_at
            FROM conversations
            WHERE user_id = ${req.userId}
            ORDER BY updated_at DESC
            LIMIT 50
        `;
        res.json({ conversations });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
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
            tokenBalance: 0
        });
    }
    
    try {
        const profile = await sql`
            SELECT * FROM user_profiles
            WHERE user_id = ${req.userId}
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

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});