// Chat Manager Module for handling conversations and messages
export class ChatManager {
    constructor(supabase, chatApp) {
        this.supabase = supabase;
        this.chatApp = chatApp;
        this.conversations = [];
        this.currentConversationId = null;
        this.messages = [];
        this.user = null;
        this.sessionId = this.getOrCreateSessionId();
    }

    // Get or create a session ID for guest users
    getOrCreateSessionId() {
        let sessionId = localStorage.getItem('guestSessionId');
        if (!sessionId) {
            sessionId = 'guest-' + this.generateUUID();
            localStorage.setItem('guestSessionId', sessionId);
        }
        return sessionId;
    }

    // Generate UUID
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async initialize(user) {
        this.user = user;
        this.initialized = false;
        
        // Show skeleton loader immediately on initialization
        this.showSkeletonLoader();
        
        if (user) {
            await this.loadUserConversations();
        } else {
            await this.loadGuestConversations();
        }
        
        this.initialized = true;
    }

    // Load guest conversations from localStorage and database
    async loadGuestConversations() {
        
        // If no Supabase, load from localStorage only
        if (!this.supabase) {
            this.conversations = JSON.parse(localStorage.getItem('guestConversations') || '[]');
            this.renderConversationsList();
            return;
        }
        
        try {
            // Load from Supabase guest_conversations table
            const { data: conversations, error } = await this.supabase
                .from('guest_conversations')
                .select('*')
                .eq('session_id', this.sessionId)
                .eq('is_archived', false)
                .order('updated_at', { ascending: false })
                .limit(7); // Limit guest users to 7 conversations
            
            if (error) throw error;
            
            this.conversations = conversations || [];
            
            // Also check localStorage for any unsaved conversations
            const localConversations = JSON.parse(localStorage.getItem('guestConversations') || '[]');
            
            // Merge local and database conversations
            localConversations.forEach(localConv => {
                if (!this.conversations.find(c => c.id === localConv.id)) {
                    this.conversations.push(localConv);
                }
            });
            
            this.renderConversationsList();
            
            // Don't automatically load conversations on homepage
            // Only load if we're on a chat URL (handled by handleInitialRoute)
        } catch (error) {
            console.error('Failed to load guest conversations:', error);
            // Fall back to localStorage only
            this.conversations = JSON.parse(localStorage.getItem('guestConversations') || '[]');
            this.renderConversationsList();
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
            
            // Don't automatically load conversations on homepage
            // Only load if we're on a chat URL (handled by handleInitialRoute)
        } catch (error) {
            console.error('Failed to load conversations:', error);
        }
    }

    // Load specific conversation with messages
    async loadConversation(conversationId) {
        if (!conversationId) {
            console.error('No conversation ID provided');
            return;
        }
        
        // If no Supabase, try to load from localStorage
        if (!this.supabase) {
            const localConversations = JSON.parse(localStorage.getItem('guestConversations') || '[]');
            const conversation = localConversations.find(c => c.id === conversationId);
            if (conversation) {
                this.currentConversationId = conversationId;
                this.messages = conversation.messages || [];
                this.chatApp.currentConversationId = conversationId;
                this.chatApp.isFirstMessage = false;
                this.chatApp.switchToChatView();
                this.renderMessages();
                this.updateActiveConversation(conversationId);
            }
            return;
        }
        
        try {
            let messages, error;
            let conversation, convError;
            
            if (this.user) {
                // Load conversation details
                ({ data: conversation, error: convError } = await this.supabase
                    .from('conversations')
                    .select('*')
                    .eq('id', conversationId)
                    .single());
                    
                // Load messages
                ({ data: messages, error } = await this.supabase
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', conversationId)
                    .order('created_at', { ascending: true }));
            } else {
                // Load guest conversation details
                // First try with session_id for security
                ({ data: conversation, error: convError } = await this.supabase
                    .from('guest_conversations')
                    .select('*')
                    .eq('id', conversationId)
                    .eq('session_id', this.sessionId)
                    .single());
                
                // If not found with session_id, try without it (for shared URLs or after session changes)
                if (!conversation || convError) {
                    ({ data: conversation, error: convError } = await this.supabase
                        .from('guest_conversations')
                        .select('*')
                        .eq('id', conversationId)
                        .single());
                }
                    
                // Load guest messages - try with session first, then without
                ({ data: messages, error } = await this.supabase
                    .from('guest_messages')
                    .select('*')
                    .eq('conversation_id', conversationId)
                    .order('created_at', { ascending: true }));
            }
            
            if (convError || !conversation) {
                console.error('Failed to load conversation details:', convError);
                // Try loading from localStorage as fallback
                const localConversations = JSON.parse(localStorage.getItem('guestConversations') || '[]');
                const localConv = localConversations.find(c => c.id === conversationId);
                if (localConv) {
                    this.currentConversationId = conversationId;
                    this.messages = localConv.messages || [];
                    this.chatApp.currentConversationId = conversationId;
                    this.chatApp.isFirstMessage = false;
                    this.chatApp.switchToChatView();
                    this.renderMessages();
                    this.updateActiveConversation(conversationId);
                    return;
                }
                // Conversation not found - redirect to home
                console.warn('Conversation not found:', conversationId);
                window.history.replaceState({}, '', '/');
                this.chatApp.showWelcomeView();
                return;
            }
            
            if (error) {
                console.error('Failed to load messages:', error);
                this.messages = [];
            } else {
                this.messages = messages || [];
            }
            
            this.currentConversationId = conversationId;
            
            // Update UI
            this.chatApp.currentConversationId = conversationId;
            this.chatApp.isFirstMessage = false;
            this.chatApp.messages = this.messages;
            
            // Show chat view and render messages
            this.chatApp.switchToChatView();
            this.renderMessages();
            
            // Update active conversation in sidebar
            this.updateActiveConversation(conversationId);
            
            // Update model selector to conversation's model
            if (conversation && conversation.model) {
                this.chatApp.modelSelect.value = conversation.model;
                this.chatApp.updateModelDisplay();
            }
            
            // Add conversation to list if not already there
            if (conversation && !this.conversations.find(c => c.id === conversationId)) {
                this.conversations.unshift(conversation);
                this.renderConversationsList();
            }
        } catch (error) {
            console.error('Failed to load conversation:', error);
        }
    }

    // Create new conversation
    async createConversation(title, model, conversationId = null) {
        // Handle case where there's no Supabase
        if (!this.supabase) {
            const conversation = {
                id: conversationId || this.generateUUID(),
                session_id: this.sessionId,
                title: title || 'New Chat',
                model: model,
                messages: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            // Save to localStorage
            const localConversations = JSON.parse(localStorage.getItem('guestConversations') || '[]');
            localConversations.unshift(conversation);
            localStorage.setItem('guestConversations', JSON.stringify(localConversations.slice(0, 7)));
            
            this.currentConversationId = conversation.id;
            this.conversations.unshift(conversation);
            this.renderConversationsList();
            this.updateActiveConversation(conversation.id);
            
            return conversation.id;
        }
        
        try {
            let conversation;
            
            if (this.user) {
                // Create for authenticated user
                const conversationData = {
                    user_id: this.user.id,
                    title: title || 'New Chat',
                    model: model
                };
                
                if (conversationId) {
                    conversationData.id = conversationId;
                }
                
                const { data, error } = await this.supabase
                    .from('conversations')
                    .insert(conversationData)
                    .select()
                    .single();
                
                if (error) throw error;
                conversation = data;
            } else {
                // Create for guest user
                const conversationData = {
                    session_id: this.sessionId,
                    title: title || 'New Chat',
                    model: model
                };
                
                if (conversationId) {
                    conversationData.id = conversationId;
                }
                
                const { data, error } = await this.supabase
                    .from('guest_conversations')
                    .insert(conversationData)
                    .select()
                    .single();
                
                if (error) {
                    // If database fails, save to localStorage
                    console.warn('Failed to save to database, using localStorage:', error);
                    conversation = {
                        id: conversationId || this.generateUUID(),
                        ...conversationData,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                    
                    // Save to localStorage
                    const localConversations = JSON.parse(localStorage.getItem('guestConversations') || '[]');
                    localConversations.unshift(conversation);
                    localStorage.setItem('guestConversations', JSON.stringify(localConversations.slice(0, 7)));
                } else {
                    conversation = data;
                }
            }
            
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
        if (!this.currentConversationId) return;
        
        // If no Supabase, save to localStorage
        if (!this.supabase) {
            const message = {
                id: this.generateUUID(),
                conversation_id: this.currentConversationId,
                role: role,
                content: content,
                model: model || this.chatApp.modelSelect.value,
                created_at: new Date().toISOString()
            };
            
            this.messages.push(message);
            
            // Update localStorage
            const localConversations = JSON.parse(localStorage.getItem('guestConversations') || '[]');
            const convIndex = localConversations.findIndex(c => c.id === this.currentConversationId);
            if (convIndex !== -1) {
                if (!localConversations[convIndex].messages) {
                    localConversations[convIndex].messages = [];
                }
                localConversations[convIndex].messages.push(message);
                localConversations[convIndex].updated_at = new Date().toISOString();
                localStorage.setItem('guestConversations', JSON.stringify(localConversations));
            }
            return message;
        }
        
        try {
            let message;
            
            if (this.user) {
                // Save for authenticated user
                const { data, error } = await this.supabase
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
                message = data;
            } else {
                // Save for guest user
                const { data, error } = await this.supabase
                    .from('guest_messages')
                    .insert({
                        conversation_id: this.currentConversationId,
                        session_id: this.sessionId,
                        role: role,
                        content: content,
                        model: model || this.chatApp.modelSelect.value,
                        credits_used: creditsUsed
                    })
                    .select()
                    .single();
                
                if (error) {
                    // If database fails, save to localStorage
                    console.warn('Failed to save message to database:', error);
                    message = {
                        id: this.generateUUID(),
                        conversation_id: this.currentConversationId,
                        session_id: this.sessionId,
                        role: role,
                        content: content,
                        model: model || this.chatApp.modelSelect.value,
                        credits_used: creditsUsed,
                        created_at: new Date().toISOString()
                    };
                    
                    // Update conversation in localStorage
                    const localConversations = JSON.parse(localStorage.getItem('guestConversations') || '[]');
                    const convIndex = localConversations.findIndex(c => c.id === this.currentConversationId);
                    if (convIndex !== -1) {
                        if (!localConversations[convIndex].messages) {
                            localConversations[convIndex].messages = [];
                        }
                        localConversations[convIndex].messages.push(message);
                        localConversations[convIndex].updated_at = new Date().toISOString();
                        localStorage.setItem('guestConversations', JSON.stringify(localConversations));
                    }
                } else {
                    message = data;
                }
            }
            
            this.messages.push(message);
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

    // Start new chat - redirects to homepage
    startNewChat() {
        // Redirect to homepage for new chat
        window.location.href = '/';
    }

    // Show skeleton loader while loading conversations
    showSkeletonLoader() {
        const conversationsList = document.querySelector('.conversations-list');
        if (!conversationsList) return;
        
        // Calculate how many skeleton items to show based on available height
        const containerHeight = conversationsList.offsetHeight || window.innerHeight - 200;
        const sidebar = document.querySelector('.sidebar');
        const isExpanded = sidebar && sidebar.classList.contains('expanded');
        const isOpen = sidebar && sidebar.classList.contains('open'); // Check for mobile open state
        
        // Different heights for different states
        let itemHeight = 44; // Default for minimized
        if (isExpanded || isOpen) {
            itemHeight = 52; // Expanded or mobile open
        }
        
        // For mobile, calculate based on actual available space
        if (window.innerWidth <= 768 && isOpen) {
            // Account for header and footer on mobile
            const availableHeight = window.innerHeight - 120 - 60; // Subtract header and footer heights
            const mobileItemCount = Math.floor(availableHeight / itemHeight);
            const itemCount = mobileItemCount > 0 ? mobileItemCount : 10;
            
            // Create skeleton HTML for mobile - single line like desktop expanded
            let skeletonHTML = '<div class="skeleton-loader">';
            for (let i = 0; i < itemCount; i++) {
                skeletonHTML += `
                    <div class="skeleton-item">
                        <div class="skeleton-text title"></div>
                    </div>
                `;
            }
            skeletonHTML += '</div>';
            
            conversationsList.innerHTML = skeletonHTML;
            return;
        }
        
        // Desktop calculation
        const itemCount = Math.ceil(containerHeight / itemHeight) + 2; // Add extra items for full coverage
        
        // Create skeleton HTML
        let skeletonHTML = '<div class="skeleton-loader">';
        for (let i = 0; i < itemCount; i++) {
            skeletonHTML += `
                <div class="skeleton-item">
                    <div class="skeleton-text title"></div>
                    <div class="skeleton-text subtitle"></div>
                </div>
            `;
        }
        skeletonHTML += '</div>';
        
        conversationsList.innerHTML = skeletonHTML;
    }
    
    // Render conversations list in sidebar
    renderConversationsList() {
        const conversationsList = document.querySelector('.conversations-list');
        if (!conversationsList) return;
        
        // Clear existing items
        conversationsList.innerHTML = '';
        
        // If no conversations, show placeholder
        if (this.conversations.length === 0) {
            conversationsList.innerHTML = `
                <div class="no-conversations" title="Start a new chat to begin">
                    <i class="fas fa-comments"></i>
                    <p>Start a new chat to begin</p>
                </div>
            `;
            return;
        }
        
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
                    // Update URL and load conversation
                    window.history.pushState({}, '', `/chat/${conv.id}`);
                    this.loadConversation(conv.id);
                }
            });
            
            conversationsList.appendChild(convItem);
        });
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