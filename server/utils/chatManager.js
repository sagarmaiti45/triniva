// Chat Management System
import { countTokens } from './tokenCounter.js';
import { sql } from '../config/database.js';

export class ChatManager {
    constructor() {
        this.maxTokensPerChat = 8000; // Token limit per chat session
        this.maxChatsPerUser = {
            free: 7,     // Free users: 7 chats
            starter: 30, // Starter: 30 chats  
            pro: 30,     // Pro: 30 chats
            business: 30 // Business: 30 chats
        };
    }

    // Calculate total tokens in a conversation
    calculateConversationTokens(messages) {
        let totalTokens = 0;
        for (const message of messages) {
            if (typeof message.content === 'string') {
                totalTokens += countTokens(message.content);
            } else if (Array.isArray(message.content)) {
                // Handle multimodal content
                for (const content of message.content) {
                    if (content.type === 'text') {
                        totalTokens += countTokens(content.text);
                    }
                }
            }
        }
        return totalTokens;
    }

    // Check if adding a new message would exceed token limit
    wouldExceedTokenLimit(existingMessages, newMessage) {
        const existingTokens = this.calculateConversationTokens(existingMessages);
        const newTokens = countTokens(newMessage);
        return (existingTokens + newTokens) > this.maxTokensPerChat;
    }

    // Generate chat title from first user message
    generateChatTitle(firstMessage, maxWords = 6) {
        if (!firstMessage || !firstMessage.trim()) {
            return 'New Chat';
        }

        const words = firstMessage.trim().split(/\s+/);
        const title = words.slice(0, maxWords).join(' ');
        
        // Add ellipsis if truncated
        if (words.length > maxWords) {
            return title + '...';
        }
        
        return title || 'New Chat';
    }

    // Get user's chat limit based on plan
    getUserChatLimit(userPlan) {
        return this.maxChatsPerUser[userPlan] || this.maxChatsPerUser.free;
    }

    // Clean up old chats when limit is exceeded
    async cleanupOldChats(userId, userPlan) {
        const chatLimit = this.getUserChatLimit(userPlan);
        
        try {
            // Get all user's chats ordered by last update (most recent first)
            const allChats = await sql`
                SELECT id 
                FROM conversations 
                WHERE user_id = ${userId}
                ORDER BY updated_at DESC
            `;

            // If we have more chats than the limit, delete the oldest ones
            if (allChats.length >= chatLimit) {
                const chatsToDelete = allChats.slice(chatLimit - 1); // Keep space for 1 new chat
                
                for (const chat of chatsToDelete) {
                    await sql`DELETE FROM conversations WHERE id = ${chat.id}`;
                }
                
                console.log(`Cleaned up ${chatsToDelete.length} old chats for user ${userId}`);
            }
        } catch (error) {
            console.error('Error cleaning up old chats:', error);
        }
    }

    // Create a new chat session
    async createNewChat(userId, userPlan, firstMessage) {
        const chatId = crypto.randomUUID();
        const title = this.generateChatTitle(firstMessage);
        const timestamp = new Date().toISOString();

        try {
            // Clean up old chats first
            await this.cleanupOldChats(userId, userPlan);

            // Create new conversation
            await sql`
                INSERT INTO conversations (
                    id, user_id, session_id, title, messages, 
                    created_at, updated_at, token_count
                )
                VALUES (
                    ${chatId}, ${userId}, ${chatId}, ${title}, '[]'::jsonb,
                    ${timestamp}, ${timestamp}, 0
                )
            `;

            return {
                chatId,
                title,
                messages: [],
                tokenCount: 0
            };
        } catch (error) {
            console.error('Error creating new chat:', error);
            throw new Error('Failed to create new chat');
        }
    }

    // Get recent chats for sidebar
    async getRecentChats(userId, limit = null) {
        try {
            const query = limit ? 
                sql`SELECT id, title, updated_at, token_count 
                    FROM conversations 
                    WHERE user_id = ${userId} 
                    ORDER BY updated_at DESC 
                    LIMIT ${limit}` :
                sql`SELECT id, title, updated_at, token_count 
                    FROM conversations 
                    WHERE user_id = ${userId} 
                    ORDER BY updated_at DESC`;

            const chats = await query;
            
            return chats.map(chat => ({
                id: chat.id,
                title: chat.title,
                timestamp: new Date(chat.updated_at).toLocaleString(),
                tokenCount: chat.token_count || 0,
                isNearLimit: (chat.token_count || 0) > (this.maxTokensPerChat * 0.8)
            }));
        } catch (error) {
            console.error('Error fetching recent chats:', error);
            return [];
        }
    }

    // Update conversation with new message and recalculate tokens
    async updateConversation(chatId, messages, newMessage = null) {
        try {
            const updatedMessages = newMessage ? [...messages, newMessage] : messages;
            const tokenCount = this.calculateConversationTokens(updatedMessages);
            
            await sql`
                UPDATE conversations 
                SET messages = ${JSON.stringify(updatedMessages)}::jsonb,
                    token_count = ${tokenCount},
                    updated_at = NOW()
                WHERE id = ${chatId}
            `;

            return {
                messages: updatedMessages,
                tokenCount,
                isNearLimit: tokenCount > (this.maxTokensPerChat * 0.8),
                exceededLimit: tokenCount > this.maxTokensPerChat
            };
        } catch (error) {
            console.error('Error updating conversation:', error);
            throw new Error('Failed to update conversation');
        }
    }

    // Get conversation with token info
    async getConversation(chatId, userId) {
        try {
            const result = await sql`
                SELECT * FROM conversations 
                WHERE id = ${chatId} AND user_id = ${userId}
                LIMIT 1
            `;

            if (result.length === 0) {
                return null;
            }

            const conversation = result[0];
            const messages = conversation.messages || [];
            const tokenCount = conversation.token_count || this.calculateConversationTokens(messages);

            return {
                id: conversation.id,
                title: conversation.title,
                messages,
                tokenCount,
                isNearLimit: tokenCount > (this.maxTokensPerChat * 0.8),
                exceededLimit: tokenCount > this.maxTokensPerChat,
                createdAt: conversation.created_at,
                updatedAt: conversation.updated_at
            };
        } catch (error) {
            console.error('Error fetching conversation:', error);
            return null;
        }
    }
}

export default ChatManager;