// Chat Manager Module for handling conversations and messages
export class ChatManager {
    constructor(supabase, chatApp) {
        this.supabase = supabase;
        this.chatApp = chatApp;
        this.conversations = [];
        this.currentConversationId = null;
        this.messages = [];
        this.user = null;
    }

    async initialize(user) {
        this.user = user;
        if (user) {
            await this.loadUserConversations();
        }
    }

    // Load all user conversations
    async loadUserConversations() {
        if (!this.supabase || !this.user) return;
        
        try {
            const { data: conversations, error } = await this.supabase
                .from('conversations')
                .select('*')
                .eq('user_id', this.user.id)
                .eq('is_archived', false)
                .order('updated_at', { ascending: false })
                .limit(50);
            
            if (error) throw error;
            
            this.conversations = conversations || [];
            this.renderConversationsList();
            
            // Load the most recent conversation if exists
            if (this.conversations.length > 0) {
                await this.loadConversation(this.conversations[0].id);
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
        }
    }

    // Load specific conversation with messages
    async loadConversation(conversationId) {
        if (!this.supabase || !conversationId) return;
        
        try {
            // Load messages for this conversation
            const { data: messages, error } = await this.supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            
            this.currentConversationId = conversationId;
            this.messages = messages || [];
            
            // Update UI
            this.chatApp.currentConversationId = conversationId;
            this.chatApp.isFirstMessage = false;
            this.chatApp.messages = this.messages;
            
            // Show chat view and render messages
            this.chatApp.showChatView();
            this.renderMessages();
            
            // Update active conversation in sidebar
            this.updateActiveConversation(conversationId);
            
            // Update model selector to conversation's model
            const conversation = this.conversations.find(c => c.id === conversationId);
            if (conversation && conversation.model) {
                this.chatApp.modelSelect.value = conversation.model;
                this.chatApp.updateModelDisplay();
            }
        } catch (error) {
            console.error('Failed to load conversation:', error);
        }
    }

    // Create new conversation
    async createConversation(title, model) {
        if (!this.supabase || !this.user) return null;
        
        try {
            const { data: conversation, error } = await this.supabase
                .from('conversations')
                .insert({
                    user_id: this.user.id,
                    title: title || 'New Chat',
                    model: model
                })
                .select()
                .single();
            
            if (error) throw error;
            
            this.currentConversationId = conversation.id;
            this.conversations.unshift(conversation);
            this.renderConversationsList();
            this.updateActiveConversation(conversation.id);
            
            return conversation.id;
        } catch (error) {
            console.error('Failed to create conversation:', error);
            return null;
        }
    }

    // Save message to database
    async saveMessage(content, role, model = null, creditsUsed = 0) {
        if (!this.supabase || !this.user || !this.currentConversationId) return;
        
        try {
            const { data: message, error } = await this.supabase
                .from('messages')
                .insert({
                    conversation_id: this.currentConversationId,
                    user_id: this.user.id,
                    role: role,
                    content: content,
                    model: model || this.chatApp.modelSelect.value,
                    credits_used: creditsUsed
                })
                .select()
                .single();
            
            if (error) throw error;
            
            this.messages.push(message);
            
            // Update conversation's updated_at is handled by database trigger
            
            return message;
        } catch (error) {
            console.error('Failed to save message:', error);
        }
    }

    // Update conversation title
    async updateConversationTitle(conversationId, title) {
        if (!this.supabase || !conversationId) return;
        
        try {
            const { error } = await this.supabase
                .from('conversations')
                .update({ title: title })
                .eq('id', conversationId);
            
            if (error) throw error;
            
            // Update local array
            const conv = this.conversations.find(c => c.id === conversationId);
            if (conv) {
                conv.title = title;
                this.renderConversationsList();
            }
        } catch (error) {
            console.error('Failed to update conversation title:', error);
        }
    }

    // Delete conversation
    async deleteConversation(conversationId) {
        if (!this.supabase || !conversationId) return;
        
        if (!confirm('Are you sure you want to delete this conversation?')) return;
        
        try {
            const { error } = await this.supabase
                .from('conversations')
                .delete()
                .eq('id', conversationId);
            
            if (error) throw error;
            
            // Remove from local array
            this.conversations = this.conversations.filter(c => c.id !== conversationId);
            this.renderConversationsList();
            
            // If deleting current conversation, start new
            if (conversationId === this.currentConversationId) {
                this.startNewChat();
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }
    }

    // Start new chat
    startNewChat() {
        this.currentConversationId = null;
        this.messages = [];
        this.chatApp.currentConversationId = null;
        this.chatApp.messages = [];
        this.chatApp.isFirstMessage = true;
        this.chatApp.showWelcomeView();
        
        // Remove active state from sidebar items
        const conversationsList = document.querySelector('.conversations-list');
        if (conversationsList) {
            conversationsList.querySelectorAll('.conversation-item').forEach(item => {
                item.classList.remove('active');
            });
        }
    }

    // Render conversations list in sidebar
    renderConversationsList() {
        const conversationsList = document.querySelector('.conversations-list');
        if (!conversationsList) return;
        
        // Clear existing items
        conversationsList.innerHTML = '';
        
        // Add each conversation
        this.conversations.forEach(conv => {
            const convItem = document.createElement('div');
            convItem.className = 'conversation-item';
            convItem.dataset.id = conv.id;
            convItem.title = conv.title;
            
            // Truncate title for display
            const displayTitle = conv.title.length > 30 
                ? conv.title.substring(0, 30) + '...' 
                : conv.title;
            
            convItem.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span class="conv-text">${displayTitle}</span>
                <button class="conv-delete-btn" data-id="${conv.id}" title="Delete conversation">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            
            // Add click handlers
            convItem.addEventListener('click', (e) => {
                if (e.target.closest('.conv-delete-btn')) {
                    e.stopPropagation();
                    this.deleteConversation(conv.id);
                } else {
                    this.loadConversation(conv.id);
                }
            });
            
            conversationsList.appendChild(convItem);
        });
        
        // If no conversations, show placeholder
        if (this.conversations.length === 0) {
            conversationsList.innerHTML = `
                <div class="no-conversations">
                    <i class="fas fa-comments"></i>
                    <p>No conversations yet</p>
                </div>
            `;
        }
    }

    // Render messages in chat area
    renderMessages() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;
        
        messagesContainer.innerHTML = '';
        
        this.messages.forEach(msg => {
            this.chatApp.addMessage(msg.content, msg.role, false, false);
        });
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Update active conversation highlighting
    updateActiveConversation(conversationId) {
        // Remove active class from all items
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to current conversation
        const activeItem = document.querySelector(`[data-id="${conversationId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    // Get conversation context for API calls
    getConversationContext(limit = 10) {
        // Get recent messages for context
        const recentMessages = this.messages.slice(-limit);
        
        return recentMessages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    }

    // Generate smart title from first message
    generateTitle(firstMessage) {
        // Simple title generation - take first 100 chars
        // Later this can be enhanced with AI
        if (!firstMessage) return 'New Chat';
        
        // Remove extra whitespace and truncate
        const cleaned = firstMessage.replace(/\s+/g, ' ').trim();
        
        // If it's a question, use it as title
        if (cleaned.includes('?')) {
            const question = cleaned.split('?')[0] + '?';
            return question.length > 100 ? question.substring(0, 97) + '...' : question;
        }
        
        // Otherwise, use first sentence or 100 chars
        const firstSentence = cleaned.split(/[.!?]/)[0];
        if (firstSentence.length <= 100) {
            return firstSentence;
        }
        
        return cleaned.substring(0, 97) + '...';
    }
}