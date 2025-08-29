class ChatApp {
    constructor() {
        this.sessionId = null;
        this.isStreaming = false;
        this.conversations = [];
        this.currentConversationId = null;
        this.isFirstMessage = true;
        this.authToken = null;
        this.user = null;
        this.initElements();
        this.checkAuthStatus();
        this.initSession();
        this.bindEvents();
        this.enableSendButtons();
        this.autoFocusPrompt();
    }

    initElements() {
        // Views
        this.welcomeView = document.getElementById('welcomeView');
        this.chatView = document.getElementById('chatView');
        
        // Hero/Welcome elements
        this.heroMessageInput = document.getElementById('heroMessageInput');
        this.heroSendButton = document.getElementById('heroSendButton');
        
        // Chat elements
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        
        // Common elements
        this.modelSelect = document.getElementById('modelSelect');
        this.modelButtonMobile = document.getElementById('mobileModelButton');
        this.mobileModelLogo = this.modelButtonMobile?.querySelector('.mobile-model-logo');
        this.newChatBtn = document.querySelector('.new-chat-btn');
        this.conversationsList = document.querySelector('.conversations-list');
        this.sidebar = document.querySelector('.sidebar');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.mobileMenuToggle = document.getElementById('mobileMenuToggle');
        this.sidebarCloseMobile = document.getElementById('sidebarCloseMobile');
        
        // Custom dropdown elements
        this.customDropdown = document.getElementById('customModelDropdown');
        this.dropdownTrigger = document.getElementById('modelDropdownTrigger');
        this.dropdownMenu = document.getElementById('modelDropdownMenu');
        
        // Attach menu elements
        this.heroAttachButton = document.getElementById('heroAttachButton');
        this.heroAttachMenu = document.getElementById('heroAttachMenu');
        this.heroImageInput = document.getElementById('heroImageInput');
        this.heroImagePreview = document.getElementById('heroImagePreview');
        this.chatAttachButton = document.getElementById('chatAttachButton');
        this.chatAttachMenu = document.getElementById('chatAttachMenu');
        this.chatImageInput = document.getElementById('chatImageInput');
        this.chatImagePreview = document.getElementById('chatImagePreview');
        
        // Store attached images
        this.attachedImages = [];
        
        // Set greeting based on time
        this.setGreeting();
        
        // Set dynamic text
        this.setDynamicText();
        
        // Initialize custom dropdown
        this.initCustomDropdown();
        
        // Initialize attach menu visibility
        this.updateAttachMenuVisibility();
        
        // Handle mobile viewport height
        this.handleMobileViewport();
    }
    
    setDynamicText() {
        const dynamicTextElement = document.getElementById('dynamicText');
        if (!dynamicTextElement) return;
        
        const texts = [
            "What's on your mind today?",
            "How can I assist you today?",
            "What would you like to explore?",
            "Ready to create something amazing?",
            "What can I help you with?",
            "Let's solve something together",
            "What are you working on today?",
            "How can I make your day better?"
        ];
        
        // Pick a random text or rotate based on time
        const randomIndex = Math.floor(Math.random() * texts.length);
        dynamicTextElement.textContent = texts[randomIndex];
    }
    
    handleMobileViewport() {
        // Set viewport height dynamically to account for mobile browser UI
        const setViewportHeight = () => {
            // Get the actual viewport height
            const vh = window.innerHeight * 0.01;
            // Set the CSS custom property
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        // Set on load
        setViewportHeight();
        
        // Update on resize and orientation change
        window.addEventListener('resize', setViewportHeight);
        window.addEventListener('orientationchange', setViewportHeight);
        
        // Enable pull-to-refresh on mobile
        if ('ontouchstart' in window) {
            let startY = 0;
            let currentY = 0;
            
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.addEventListener('touchstart', (e) => {
                    startY = e.touches[0].pageY;
                }, { passive: true });
                
                mainContent.addEventListener('touchmove', (e) => {
                    currentY = e.touches[0].pageY;
                    // Allow overscroll at the top for refresh
                    if (mainContent.scrollTop === 0 && currentY > startY) {
                        e.stopPropagation();
                    }
                }, { passive: true });
            }
        }
    }
    
    setGreeting() {
        const greetingElement = document.getElementById('greeting');
        if (!greetingElement) return;
        
        const hour = new Date().getHours();
        let greeting = '';
        
        if (hour >= 5 && hour < 12) {
            greeting = 'Good morning,';
        } else if (hour >= 12 && hour < 17) {
            greeting = 'Good afternoon,';
        } else if (hour >= 17 && hour < 21) {
            greeting = 'Good evening,';
        } else {
            greeting = 'Good night,';
        }
        
        greetingElement.textContent = greeting;
    }

    async initSession() {
        try {
            const response = await fetch('/api/session');
            const data = await response.json();
            this.sessionId = data.sessionId;
        } catch (error) {
            console.error('Failed to initialize session:', error);
        }
    }

    bindEvents() {
        // Hero input events
        this.heroSendButton.addEventListener('click', () => this.sendMessageFromHero());
        
        this.heroMessageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessageFromHero();
            }
        });

        this.heroMessageInput.addEventListener('input', () => {
            this.adjustTextareaHeight(this.heroMessageInput);
            this.enableSendButtons();
        });

        // Chat input events
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.messageInput.addEventListener('input', () => {
            this.adjustTextareaHeight(this.messageInput);
            this.enableSendButtons();
        });

        // New chat button
        this.newChatBtn.addEventListener('click', () => {
            if (window.chatManager) {
                window.chatManager.startNewChat();
            } else {
                this.createNewConversation();
            }
        });

        // Sidebar toggle button
        this.sidebarToggle.addEventListener('click', () => {
            this.toggleSidebar();
        });
        
        // Mobile model button - open the dropdown
        if (this.modelButtonMobile) {
            this.modelButtonMobile.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.customDropdown) {
                    this.customDropdown.classList.toggle('open');
                }
            });
        }
        
        // Mobile menu toggle
        if (this.mobileMenuToggle) {
            this.mobileMenuToggle.addEventListener('click', () => {
                this.toggleMobileSidebar();
            });
        }
        
        // Mobile sidebar close button
        if (this.sidebarCloseMobile) {
            this.sidebarCloseMobile.addEventListener('click', () => {
                this.closeMobileSidebar();
            });
        }

        // Attach button events
        this.initAttachMenu();
        
        // 3-dot menu button
        this.initMainMenu();
        
        // Click outside to close sidebar on mobile
        document.addEventListener('click', (e) => {
            // Check if sidebar is open and click is outside
            if (this.sidebar && this.sidebar.classList.contains('open')) {
                const isClickInsideSidebar = this.sidebar.contains(e.target);
                const isClickOnMenuToggle = this.mobileMenuToggle && this.mobileMenuToggle.contains(e.target);
                
                if (!isClickInsideSidebar && !isClickOnMenuToggle) {
                    this.closeMobileSidebar();
                }
            }
            
            // Handle conversation item clicks
            if (e.target.closest('.conversation-item')) {
                const item = e.target.closest('.conversation-item');
                const convId = item.dataset.conversationId;
                if (convId) {
                    this.loadConversation(convId);
                }
            }
        });
    }

    toggleSidebar() {
        this.sidebar.classList.toggle('expanded');
        const icon = this.sidebarToggle.querySelector('i');
        if (this.sidebar.classList.contains('expanded')) {
            icon.classList.remove('fa-chevron-right');
            icon.classList.add('fa-chevron-left');
        } else {
            icon.classList.remove('fa-chevron-left');
            icon.classList.add('fa-chevron-right');
        }
    }
    
    toggleMobileSidebar() {
        this.sidebar.classList.toggle('open');
        this.mobileMenuToggle.classList.toggle('active');
    }
    
    closeMobileSidebar() {
        this.sidebar.classList.remove('open');
        if (this.mobileMenuToggle) {
            this.mobileMenuToggle.classList.remove('active');
        }
    }
    
    initCustomDropdown() {
        // Model configuration with logos and capabilities
        this.modelConfig = [
            { value: 'openai/gpt-oss-20b:free', label: 'GPT OSS 20B', logo: 'openai.png', isFree: true, supportsImages: true },
            { value: 'mistralai/mistral-medium', label: 'Mistral Medium', logo: 'mistral-color.png', isFree: false, supportsImages: false },
            { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', logo: 'openai.png', isFree: false, supportsImages: true },
            { value: 'qwen/qwen3-coder', label: 'Qwen3 Coder', logo: 'qwen-color.png', isFree: false, supportsImages: true },
            { value: 'moonshotai/kimi-k2:free', label: 'Kimi K2', logo: 'moonshot.png', isFree: true, supportsImages: false },
            { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4', logo: 'anthropic.png', isFree: false, supportsImages: true },
            { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini', logo: 'openai.png', isFree: false, supportsImages: true },
            { value: 'openai/gpt-5', label: 'GPT-5', logo: 'openai.png', isFree: false, supportsImages: true },
            { value: 'anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku', logo: 'anthropic.png', isFree: false, supportsImages: true },
            { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', logo: 'google.png', isFree: false, supportsImages: true },
            { value: 'x-ai/grok-4', label: 'Grok 4', logo: 'xai.png', isFree: false, supportsImages: true },
            { value: 'x-ai/grok-3-mini', label: 'Grok 3 Mini', logo: 'xai.png', isFree: false, supportsImages: false },
            { value: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick', logo: 'metaai-color.png', isFree: false, supportsImages: false },
            { value: 'meta-llama/llama-4-maverick:free', label: 'Llama 4 Maverick', logo: 'metaai-color.png', isFree: true, supportsImages: false },
            { value: 'z-ai/glm-4.5', label: 'GLM 4.5', logo: 'zlm_ai.png', isFree: false, supportsImages: false },
            { value: 'deepseek/deepseek-r1-0528:free', label: 'DeepSeek R1', logo: 'deepseek-color.png', isFree: true, supportsImages: false }
        ];
        
        // Build dropdown menu
        this.buildDropdownMenu();
        
        // Bind dropdown events
        this.bindDropdownEvents();
    }
    
    buildDropdownMenu() {
        if (!this.dropdownMenu) return;
        
        this.dropdownMenu.innerHTML = '';
        
        this.modelConfig.forEach(model => {
            const item = document.createElement('div');
            item.className = 'custom-model-dropdown-item';
            item.dataset.value = model.value;
            
            item.innerHTML = `
                <img src="/images/models/${model.logo}" alt="${model.label}" class="model-logo">
                <div class="model-info">
                    <span class="model-label">${model.label}</span>
                    ${model.isFree ? '<span class="model-badge">Free</span>' : ''}
                </div>
            `;
            
            // Mark selected item
            if (model.value === this.modelSelect.value) {
                item.classList.add('selected');
            }
            
            this.dropdownMenu.appendChild(item);
        });
    }
    
    bindDropdownEvents() {
        if (!this.dropdownTrigger || !this.customDropdown) return;
        
        // Toggle dropdown on trigger click
        this.dropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.customDropdown.classList.toggle('open');
        });
        
        // Handle item selection
        this.dropdownMenu.addEventListener('click', (e) => {
            const item = e.target.closest('.custom-model-dropdown-item');
            if (!item) return;
            
            const value = item.dataset.value;
            const model = this.modelConfig.find(m => m.value === value);
            
            if (model) {
                // Check if user can use this model
                const isAvailable = model.isFree || this.authToken;
                
                if (!isAvailable) {
                    // Show login prompt for paid models
                    if (confirm('This model requires authentication. Would you like to login now?')) {
                        window.location.href = '/auth/login.html';
                    }
                    return;
                }
                
                // Update hidden select
                this.modelSelect.value = value;
                
                // Update trigger display
                const triggerLogo = this.dropdownTrigger.querySelector('.model-logo');
                const triggerName = this.dropdownTrigger.querySelector('.model-name');
                
                if (triggerLogo) triggerLogo.src = `/images/models/${model.logo}`;
                if (triggerName) triggerName.textContent = model.label + (model.isFree ? ' (Free)' : '');
                
                // Update mobile model button logo
                if (this.mobileModelLogo) {
                    this.mobileModelLogo.src = `/images/models/${model.logo}`;
                    this.mobileModelLogo.alt = model.label;
                }
                if (this.modelButtonMobile) {
                    this.modelButtonMobile.title = model.label + (model.isFree ? ' (Free)' : '');
                }
                
                // Update selected state
                this.dropdownMenu.querySelectorAll('.custom-model-dropdown-item').forEach(el => {
                    el.classList.remove('selected');
                });
                item.classList.add('selected');
                
                // Close dropdown
                this.customDropdown.classList.remove('open');
                
                // Update attach menu visibility
                this.updateAttachMenuVisibility();
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.customDropdown.contains(e.target)) {
                this.customDropdown.classList.remove('open');
            }
        });
    }
    

    initAttachMenu() {
        // Hero attach button
        if (this.heroAttachButton) {
            this.heroAttachButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleAttachMenu('hero');
            });
        }
        
        // Chat attach button
        if (this.chatAttachButton) {
            this.chatAttachButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleAttachMenu('chat');
            });
        }
        
        // Attach menu items
        document.querySelectorAll('.attach-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleAttachAction(item.dataset.action, item.closest('.attach-menu').id.includes('hero') ? 'hero' : 'chat');
            });
        });
        
        // Image input handlers
        if (this.heroImageInput) {
            this.heroImageInput.addEventListener('change', (e) => this.handleImageSelect(e, 'hero'));
        }
        if (this.chatImageInput) {
            this.chatImageInput.addEventListener('change', (e) => this.handleImageSelect(e, 'chat'));
        }
        
        // Close menus on outside click
        document.addEventListener('click', () => {
            this.closeAllAttachMenus();
        });
        
        // Update attach menu visibility based on model
        this.updateAttachMenuVisibility();
    }
    
    toggleAttachMenu(type) {
        const menu = type === 'hero' ? this.heroAttachMenu : this.chatAttachMenu;
        const button = type === 'hero' ? this.heroAttachButton : this.chatAttachButton;
        
        if (menu.classList.contains('show')) {
            menu.classList.remove('show');
            button.classList.remove('active');
        } else {
            this.closeAllAttachMenus();
            menu.classList.add('show');
            button.classList.add('active');
        }
    }
    
    closeAllAttachMenus() {
        [this.heroAttachMenu, this.chatAttachMenu].forEach(menu => {
            if (menu) menu.classList.remove('show');
        });
        [this.heroAttachButton, this.chatAttachButton].forEach(button => {
            if (button) button.classList.remove('active');
        });
    }
    
    handleAttachAction(action, type) {
        if (action === 'image') {
            const input = type === 'hero' ? this.heroImageInput : this.chatImageInput;
            input.click();
        }
        // Future: handle generate-image and generate-video
        this.closeAllAttachMenus();
    }
    
    async handleImageSelect(event, type) {
        const files = Array.from(event.target.files);
        const previewContainer = type === 'hero' ? this.heroImagePreview : this.chatImagePreview;
        
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                const base64 = await this.fileToBase64(file);
                const imageData = {
                    name: file.name,
                    type: file.type,
                    data: base64,
                    url: URL.createObjectURL(file)
                };
                
                this.attachedImages.push(imageData);
                this.displayImagePreview(imageData, previewContainer);
            }
        }
        
        // Clear input for future selections
        event.target.value = '';
    }
    
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    displayImagePreview(imageData, container) {
        if (!container.classList.contains('has-images')) {
            container.classList.add('has-images');
        }
        
        const previewItem = document.createElement('div');
        previewItem.className = 'image-preview-item';
        previewItem.innerHTML = `
            <img src="${imageData.url}" alt="${imageData.name}">
            <button class="image-preview-remove" data-name="${imageData.name}">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        previewItem.querySelector('.image-preview-remove').addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeImage(imageData.name, container);
        });
        
        container.appendChild(previewItem);
    }
    
    removeImage(name, container) {
        this.attachedImages = this.attachedImages.filter(img => img.name !== name);
        
        const item = container.querySelector(`[data-name="${name}"]`).closest('.image-preview-item');
        item.remove();
        
        if (container.children.length === 0) {
            container.classList.remove('has-images');
        }
    }
    
    updateAttachMenuVisibility() {
        const selectedModel = this.modelConfig.find(m => m.value === this.modelSelect.value);
        const supportsImages = selectedModel?.supportsImages || false;
        
        document.querySelectorAll('.attach-menu-item[data-action="image"]').forEach(item => {
            if (supportsImages) {
                item.classList.remove('hidden');
                item.classList.remove('disabled');
            } else {
                item.classList.add('hidden');
            }
        });
        
        // Always show the button, but disable image option if not supported
        // Show other options (generate image/video) as coming soon
        [this.heroAttachButton, this.chatAttachButton].forEach(button => {
            if (button) {
                button.style.display = 'flex';
                // Update button appearance based on availability
                if (supportsImages) {
                    button.style.opacity = '1';
                } else {
                    button.style.opacity = '0.6';
                }
            }
        });
    }
    
    updateModelDisplay() {
        // Update the custom dropdown display when model changes
        const selectedOption = this.modelSelect.options[this.modelSelect.selectedIndex];
        if (selectedOption && this.dropdownTrigger) {
            const provider = selectedOption.value.split('/')[0];
            const modelName = selectedOption.text;
            
            // Update dropdown trigger display
            const logoImg = this.dropdownTrigger.querySelector('.model-logo');
            const nameSpan = this.dropdownTrigger.querySelector('.model-name');
            
            if (logoImg) logoImg.src = `/images/models/${provider}.png`;
            if (nameSpan) nameSpan.textContent = modelName;
            
            // Update mobile button if exists
            if (this.mobileModelLogo) {
                this.mobileModelLogo.src = `/images/models/${provider}.png`;
            }
        }
    }

    clearAttachedImages(type) {
        this.attachedImages = [];
        const container = type === 'hero' ? this.heroImagePreview : this.chatImagePreview;
        if (container) {
            container.innerHTML = '';
            container.classList.remove('has-images');
        }
    }
    
    initMainMenu() {
        const menuButton = document.getElementById('mainMenuButton');
        const menuDropdown = document.getElementById('mainMenuDropdown');
        const shareMenuItem = document.getElementById('shareMenuItem');
        const signupMenuItem = document.getElementById('signupMenuItem');
        
        if (!menuButton || !menuDropdown) return;
        
        // Toggle menu on button click
        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            menuDropdown.classList.toggle('show');
        });
        
        // Close menu on outside click
        document.addEventListener('click', () => {
            menuDropdown.classList.remove('show');
        });
        
        // Prevent menu from closing when clicking inside
        menuDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Handle share button click
        if (shareMenuItem) {
            shareMenuItem.addEventListener('click', () => {
                // Share functionality (can be implemented later)
                console.log('Share clicked');
                menuDropdown.classList.remove('show');
            });
        }
        
        // Handle signup button click
        if (signupMenuItem) {
            signupMenuItem.addEventListener('click', () => {
                window.location.href = '/auth/signup.html';
            });
        }
        
        // Update menu items visibility
        this.updateMainMenuItems();
    }
    
    updateMainMenuItems() {
        const shareMenuItem = document.getElementById('shareMenuItem');
        const signupMenuItem = document.getElementById('signupMenuItem');
        
        // Show share button only in chat view
        if (shareMenuItem) {
            const isInChatView = this.chatView && this.chatView.style.display !== 'none';
            shareMenuItem.style.display = isInChatView ? 'flex' : 'none';
        }
        
        // Show signup button and divider only if not logged in
        const isLoggedIn = !!this.authToken;
        if (signupMenuItem) {
            signupMenuItem.style.display = isLoggedIn ? 'none' : 'flex';
        }
        
        const menuDivider = document.getElementById('menuDivider');
        if (menuDivider) {
            menuDivider.style.display = isLoggedIn ? 'none' : 'block';
        }
        
        // Show logout button only if logged in
        const logoutMenuItem = document.getElementById('logoutMenuItem');
        if (logoutMenuItem) {
            logoutMenuItem.style.display = isLoggedIn ? 'flex' : 'none';
        }
    }
    
    enableSendButtons() {
        const heroHasText = this.heroMessageInput.value.trim().length > 0;
        const chatHasText = this.messageInput.value.trim().length > 0;
        const hasImages = this.attachedImages.length > 0;
        
        this.heroSendButton.disabled = (!heroHasText && !hasImages) || this.isStreaming;
        this.sendButton.disabled = (!chatHasText && !hasImages) || this.isStreaming;
    }

    adjustTextareaHeight(textarea) {
        textarea.style.height = 'auto';
        const maxHeight = textarea === this.heroMessageInput ? 150 : 200;
        textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
    }

    switchToChatView() {
        this.welcomeView.style.display = 'none';
        this.chatView.style.display = 'flex';
        document.getElementById('chatHeader').style.display = 'flex';
        
        // Add class to auth buttons container for proper spacing
        const authContainer = document.querySelector('.auth-buttons-container');
        if (authContainer) {
            authContainer.classList.add('in-chat-view');
        }
        
        // Update main menu items
        this.updateMainMenuItems();
        
        this.isFirstMessage = false;
        
        // Hide greeting container in chat view
        const greetingContainer = document.querySelector('.greeting-container');
        if (greetingContainer) {
            greetingContainer.style.display = 'none';
        }
        
        // Auto-focus on chat input for desktop
        this.autoFocusPrompt();
    }

    createNewConversation() {
        // Reload the page to start a fresh session
        window.location.reload();
    }

    loadConversation(conversationId) {
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (!conversation) return;

        this.currentConversationId = conversationId;
        this.isFirstMessage = conversation.messages.length === 0;

        if (this.isFirstMessage) {
            this.welcomeView.style.display = 'flex';
            this.chatView.style.display = 'none';
            
            // Remove class from auth buttons container when going back to welcome
            const authContainer = document.querySelector('.auth-buttons-container');
            if (authContainer) {
                authContainer.classList.remove('in-chat-view');
            }
            
            // Update main menu items
            this.updateMainMenuItems();
        } else {
            this.switchToChatView();
            this.displayConversation(conversation);
        }

        this.updateConversationsList();
    }

    displayConversation(conversation) {
        this.messagesContainer.innerHTML = '';
        conversation.messages.forEach(msg => {
            this.addMessage(msg.content, msg.role, false, false);
        });
    }

    updateConversationsList() {
        const currentConv = this.conversations.find(c => c.id === this.currentConversationId);
        if (!currentConv) return;

        // Clear the "no conversations" placeholder if it exists
        const noConversations = this.conversationsList.querySelector('.no-conversations');
        if (noConversations) {
            this.conversationsList.innerHTML = '';
        }

        let convItem = document.querySelector(`[data-conversation-id="${this.currentConversationId}"]`);
        
        if (!convItem) {
            convItem = document.createElement('div');
            convItem.className = 'conversation-item active';
            convItem.dataset.conversationId = this.currentConversationId;
            convItem.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span class="conv-text">${currentConv.title}</span>
            `;
            convItem.title = currentConv.title;
            this.conversationsList.appendChild(convItem);
        } else {
            convItem.querySelector('span').textContent = currentConv.title;
        }

        // Update active state
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        convItem.classList.add('active');
    }

    async sendMessageFromHero() {
        const message = this.heroMessageInput.value.trim();
        const hasImages = this.attachedImages.length > 0;
        
        if ((!message && !hasImages) || this.isStreaming) return;

        // Switch to chat view
        this.switchToChatView();
        
        // Add user message with images
        this.addMessage(message || "What's in this image?", 'user', false, false, this.attachedImages);
        
        // Clear hero input and images
        this.heroMessageInput.value = '';
        this.adjustTextareaHeight(this.heroMessageInput);
        this.clearAttachedImages('hero');
        
        // Process message with images
        await this.processMessage(message || "What's in this image?", this.attachedImages);
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        const hasImages = this.attachedImages.length > 0;
        
        if ((!message && !hasImages) || this.isStreaming) return;

        // If using chat manager and logged in, handle through it
        if (window.chatManager && window.chatManager.user) {
            // Create conversation if first message
            if (this.isFirstMessage) {
                const title = window.chatManager.generateTitle(message);
                const conversationId = await window.chatManager.createConversation(title, this.modelSelect.value);
                if (conversationId) {
                    this.currentConversationId = conversationId;
                    this.isFirstMessage = false;
                }
            }
            
            // Save user message to database
            await window.chatManager.saveMessage(message || "What's in this image?", 'user');
        }

        this.addMessage(message || "What's in this image?", 'user', false, false, this.attachedImages);
        
        // Save images before clearing
        const images = [...this.attachedImages];
        
        this.messageInput.value = '';
        this.adjustTextareaHeight(this.messageInput);
        this.clearAttachedImages('chat');
        this.enableSendButtons();
        
        await this.processMessage(message || "What's in this image?", images);
    }

    async processMessage(message, images = []) {
        const currentConv = this.conversations.find(c => c.id === this.currentConversationId);
        
        // Check if user is trying to use a paid model without authentication
        const selectedModel = currentConv ? currentConv.model : this.modelSelect.value;
        const isFreeModel = selectedModel.includes(':free');
        
        if (!isFreeModel && !this.authToken) {
            // User trying to use paid model without login
            this.addMessage('⚠️ This model requires authentication. Please [login](/auth/login.html) or [sign up](/auth/signup.html) to use paid models, or switch to a free model.', 'assistant');
            this.setStreamingState(false);
            return;
        }
        
        // Update conversation title if it's the first message
        if (currentConv && currentConv.messages.length === 1) {
            currentConv.title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
            currentConv.model = this.modelSelect.value;  // Store the model selection
            this.updateConversationsList();
        }

        this.setStreamingState(true);
        
        const assistantMessageId = this.addMessage('', 'assistant', true);
        const assistantBubble = document.getElementById(assistantMessageId);
        
        // Use the conversation's model, not the current selector value
        const modelToUse = currentConv ? currentConv.model : this.modelSelect.value;
        
        // Get conversation context if using chat manager
        let conversationContext = [];
        if (window.chatManager && window.chatManager.currentConversationId) {
            conversationContext = window.chatManager.getConversationContext(5); // Get last 5 messages for context
        }
        
        try {
            // Build headers with auth token if available
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (this.authToken) {
                headers['Authorization'] = `Bearer ${this.authToken}`;
            }
            
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    message: message,
                    model: modelToUse,
                    sessionId: this.sessionId,
                    context: conversationContext, // Include conversation history for better context
                    images: images.map(img => ({
                        type: 'image_url',
                        image_url: {
                            url: img.data
                        }
                    }))
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                
                if (response.status === 403) {
                    throw new Error(errorData?.message || 'Please login to use this model');
                } else if (response.status === 402) {
                    // Show upgrade prompt for insufficient credits
                    if (window.upgradePrompt) {
                        window.upgradePrompt.show(errorData?.message || 'You have run out of credits. Upgrade your plan to continue using AI models.');
                    }
                    throw new Error(errorData?.message || 'Insufficient credits. Please upgrade your plan to continue.');
                } else if (response.status === 401) {
                    throw new Error('Session expired. Please login again.');
                } else {
                    throw new Error(errorData?.error || 'Failed to get response');
                }
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        
                        if (data === '[DONE]') {
                            // Development mode: Log the complete response
                            console.log('=== COMPLETE RESPONSE ===');
                            console.log(fullResponse);
                            console.log('========================');
                            
                            assistantBubble.classList.remove('typing');
                            
                            // Add action buttons to the assistant message
                            const messageElement = assistantBubble.closest('.message');
                            if (messageElement) {
                                // Remove last-assistant class from previous messages and add to this one
                                document.querySelectorAll('.message.assistant.last-assistant').forEach(msg => {
                                    msg.classList.remove('last-assistant');
                                });
                                messageElement.classList.add('last-assistant');
                                
                                const contentDiv = messageElement.querySelector('.message-content');
                                if (contentDiv && !contentDiv.querySelector('.message-actions')) {
                                    const actionsDiv = document.createElement('div');
                                    actionsDiv.className = 'message-actions';
                                    actionsDiv.innerHTML = `
                                        <button class="action-copy" title="Copy">
                                            <i class="fas fa-copy"></i>
                                        </button>
                                        <button class="action-like" title="Good response">
                                            <i class="far fa-thumbs-up"></i>
                                        </button>
                                        <button class="action-dislike" title="Bad response">
                                            <i class="far fa-thumbs-down"></i>
                                        </button>
                                        <button class="action-regenerate" title="Regenerate response">
                                            <i class="fas fa-redo"></i>
                                        </button>
                                    `;
                                    
                                    // Add click handlers
                                    actionsDiv.querySelector('.action-copy').addEventListener('click', () => {
                                        this.copyMessage(fullResponse);
                                    });
                                    
                                    actionsDiv.querySelector('.action-regenerate').addEventListener('click', () => {
                                        this.regenerateLastResponse();
                                    });
                                    
                                    contentDiv.appendChild(actionsDiv);
                                }
                            }
                            
                            // Save assistant message to conversation
                            if (currentConv) {
                                currentConv.messages.push({
                                    role: 'assistant',
                                    content: fullResponse
                                });
                            }
                            
                            // Save to database if using chat manager
                            if (window.chatManager && window.chatManager.currentConversationId) {
                                window.chatManager.saveMessage(fullResponse, 'assistant', modelToUse);
                            }
                            break;
                        }

                        try {
                            const parsed = JSON.parse(data);
                            
                            if (parsed.error) {
                                assistantBubble.textContent = 'Error: ' + parsed.error;
                                assistantBubble.classList.remove('typing');
                            } else if (parsed.content) {
                                fullResponse += parsed.content;
                                // Development mode: Log the actual response content
                                console.log('Response chunk:', parsed.content);
                                console.log('Full response so far:', fullResponse);
                                
                                // Show streaming content with proper code block formatting
                                assistantBubble.innerHTML = this.processStreamingContent(fullResponse);
                                // Apply syntax highlighting to completed code blocks only
                                assistantBubble.querySelectorAll('pre code').forEach(block => {
                                    if (!block.classList.contains('highlighted') && !block.classList.contains('streaming')) {
                                        Prism.highlightElement(block);
                                        block.classList.add('highlighted');
                                    }
                                });
                                this.scrollToBottom();
                            }
                        } catch (e) {
                            console.error('Parse error:', e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error);
            assistantBubble.textContent = 'Sorry, an error occurred. Please try again.';
            assistantBubble.classList.remove('typing');
        } finally {
            this.setStreamingState(false);
            this.enableSendButtons();
            // Focus back on chat input
            this.messageInput.focus();
        }
    }

    addMessage(content, role, isTyping = false, saveToConversation = true, images = []) {
        const messageId = 'msg-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        // Remove last-assistant class from previous messages and add to new assistant message
        if (role === 'assistant' && !isTyping) {
            document.querySelectorAll('.message.assistant.last-assistant').forEach(msg => {
                msg.classList.remove('last-assistant');
            });
            messageDiv.classList.add('last-assistant');
        }
        
        const wrapperDiv = document.createElement('div');
        wrapperDiv.className = 'message-wrapper';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Add images if present (for user messages)
        if (images.length > 0 && role === 'user') {
            const imagesDiv = document.createElement('div');
            imagesDiv.className = 'message-images';
            imagesDiv.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;';
            
            images.forEach(img => {
                const imgElement = document.createElement('img');
                imgElement.src = img.url || img.data;
                imgElement.alt = img.name || 'Uploaded image';
                imgElement.style.cssText = 'max-width: 200px; max-height: 200px; border-radius: 8px; border: 1px solid var(--border-color); cursor: pointer;';
                imgElement.onclick = () => {
                    window.open(img.url || img.data, '_blank');
                };
                imagesDiv.appendChild(imgElement);
            });
            contentDiv.appendChild(imagesDiv);
        }
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = `message-bubble${isTyping ? ' typing' : ''}`;
        bubbleDiv.id = messageId;
        
        // Process content for code blocks if it's an assistant message
        if (role === 'assistant' && !isTyping) {
            bubbleDiv.innerHTML = this.processMessageContent(content);
            // Apply syntax highlighting to code blocks
            setTimeout(() => {
                bubbleDiv.querySelectorAll('pre code').forEach(block => {
                    Prism.highlightElement(block);
                });
            }, 0);
        } else {
            bubbleDiv.textContent = content;
        }
        
        contentDiv.appendChild(bubbleDiv);
        
        // Add action buttons for assistant messages
        if (role === 'assistant' && !isTyping) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'message-actions';
            actionsDiv.innerHTML = `
                <button class="action-copy" title="Copy">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="action-like" title="Good response">
                    <i class="far fa-thumbs-up"></i>
                </button>
                <button class="action-dislike" title="Bad response">
                    <i class="far fa-thumbs-down"></i>
                </button>
                <button class="action-regenerate" title="Regenerate response">
                    <i class="fas fa-redo"></i>
                </button>
            `;
            
            // Add click handlers
            actionsDiv.querySelector('.action-copy').addEventListener('click', () => {
                this.copyMessage(content);
            });
            
            actionsDiv.querySelector('.action-regenerate').addEventListener('click', () => {
                this.regenerateLastResponse();
            });
            
            contentDiv.appendChild(actionsDiv);
        }
        
        wrapperDiv.appendChild(contentDiv);
        messageDiv.appendChild(wrapperDiv);
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Save message to conversation
        const currentConv = this.conversations.find(c => c.id === this.currentConversationId);
        if (currentConv && !isTyping && content && saveToConversation) {
            currentConv.messages.push({ role, content });
        }
        
        return messageId;
    }

    processStreamingContent(content) {
        // Store placeholders for code blocks to avoid double processing
        const codeBlocks = [];
        let placeholderIndex = 0;
        
        // Process completed code blocks (```language\ncode\n```)
        content = content.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || 'plaintext';
            const codeId = 'code-' + Date.now() + Math.random().toString(36).substr(2, 9);
            const placeholder = `__CODE_BLOCK_${placeholderIndex}__`;
            
            const codeContent = code.trim();
            
            codeBlocks[placeholderIndex] = `<div class="code-block-container"><pre><code id="${codeId}" class="language-${language}">${this.escapeHtml(codeContent)}</code></pre></div>`;
            
            placeholderIndex++;
            return placeholder;
        });
        
        // Process incomplete code blocks (streaming)
        const incompleteCodeMatch = content.match(/```(\w*)\n?([\s\S]*)$/);
        if (incompleteCodeMatch) {
            const [fullMatch, lang, code] = incompleteCodeMatch;
            const language = lang || 'plaintext';
            const codeId = 'streaming-code-' + Date.now();
            
            // Replace the incomplete code block with a streaming version
            content = content.replace(fullMatch, `<div class="code-block-container"><pre><code id="${codeId}" class="language-${language} streaming">${this.escapeHtml(code)}</code></pre></div>`);
        }
        
        // Process inline code (`code`)
        content = content.replace(/`([^`]+)`/g, '<span class="inline-code">$1</span>');
        
        // Process markdown elements
        content = this.processMarkdown(content);
        
        // Convert line breaks to <br> for remaining text
        content = content.replace(/\n/g, '<br>');
        
        // Replace placeholders with actual code blocks
        codeBlocks.forEach((block, index) => {
            content = content.replace(`__CODE_BLOCK_${index}__`, block);
        });
        
        // Remove extra <br> tags after code blocks
        content = content.replace(/<\/div>\s*<br>/g, '</div>');
        
        return content;
    }
    
    processMessageContent(content) {
        // Store placeholders for code blocks to avoid double processing
        const codeBlocks = [];
        let placeholderIndex = 0;
        
        // Process code blocks (```language\ncode\n```)
        content = content.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || 'plaintext';
            const codeId = 'code-' + Date.now() + Math.random().toString(36).substr(2, 9);
            const placeholder = `__CODE_BLOCK_${placeholderIndex}__`;
            
            // Don't escape HTML for code - let Prism handle it
            const codeContent = code.trim();
            
            codeBlocks[placeholderIndex] = `<div class="code-block-container"><pre><code id="${codeId}" class="language-${language}">${this.escapeHtml(codeContent)}</code></pre></div>`;
            
            placeholderIndex++;
            return placeholder;
        });
        
        // Process inline code (`code`)
        content = content.replace(/`([^`]+)`/g, '<span class="inline-code">$1</span>');
        
        // Process markdown elements
        content = this.processMarkdown(content);
        
        // Convert line breaks to <br> for remaining text
        content = content.replace(/\n/g, '<br>');
        
        // Replace placeholders with actual code blocks
        codeBlocks.forEach((block, index) => {
            content = content.replace(`__CODE_BLOCK_${index}__`, block);
        });
        
        // Remove extra <br> tags after code blocks
        content = content.replace(/<\/div>\s*<br>/g, '</div>');
        
        return content;
    }
    
    processMarkdown(content) {
        // First, escape HTML tags that appear in the text (like <header>, <nav>, etc.)
        // This preserves them as visible text rather than HTML elements
        content = content.replace(/<(\/?)(header|nav|main|article|aside|footer|section|div|span|p|h[1-6]|ul|ol|li|a|img|table|tr|td|th|thead|tbody|br|hr|strong|em|b|i|u)>/g, '&lt;$1$2&gt;');
        
        // Process tables first
        content = this.processTables(content);
        
        // Process headings (### Heading)
        content = content.replace(/^### (.+)$/gm, '<h3 class="ai-heading">$1</h3>');
        content = content.replace(/^## (.+)$/gm, '<h2 class="ai-heading">$1</h2>');
        content = content.replace(/^# (.+)$/gm, '<h1 class="ai-heading">$1</h1>');
        
        // Process bold text (**text**)
        content = content.replace(/\*\*([^*]+)\*\*/g, '<strong class="ai-bold">$1</strong>');
        
        // Process italic text (*text*)
        // Use negative lookahead to avoid matching bold markers
        content = content.replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '<em class="ai-italic">$1</em>');
        
        // Process numbered lists (1. item)
        content = content.replace(/^\d+\.\s+(.+)$/gm, '<li class="ai-list-item">$1</li>');
        
        // Process bullet lists (- item or * item)
        content = content.replace(/^[-*]\s+(.+)$/gm, '<li class="ai-list-item">$1</li>');
        
        // Wrap consecutive list items in ul
        content = content.replace(/(<li class="ai-list-item">.*<\/li>)/gs, (match) => {
            return `<ul class="ai-list">${match}</ul>`;
        });
        
        return content;
    }
    
    processTables(content) {
        // Match markdown tables
        const tableRegex = /^(\|.+\|)\n(\|[-\s|:]+\|)\n((?:\|.+\|\n?)+)/gm;
        
        return content.replace(tableRegex, (match, header, separator, rows) => {
            // Process header
            const headerCells = header.split('|').slice(1, -1).map(cell => 
                `<th class="ai-table-header">${cell.trim()}</th>`
            ).join('');
            
            // Process rows
            const rowsHtml = rows.trim().split('\n').map(row => {
                const cells = row.split('|').slice(1, -1).map(cell => 
                    `<td class="ai-table-cell">${cell.trim()}</td>`
                ).join('');
                return `<tr class="ai-table-row">${cells}</tr>`;
            }).join('');
            
            return `<div class="ai-table-wrapper"><table class="ai-table"><thead><tr class="ai-table-header-row">${headerCells}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    copyMessage(content) {
        navigator.clipboard.writeText(content).then(() => {
            // Show a brief toast or feedback
            console.log('Message copied to clipboard');
        });
    }

    regenerateLastResponse() {
        // Find the last user message
        const messages = this.messagesContainer.querySelectorAll('.message');
        let lastUserMessage = '';
        
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].classList.contains('user')) {
                lastUserMessage = messages[i].querySelector('.message-bubble').textContent;
                break;
            }
        }
        
        if (lastUserMessage) {
            // Remove the last assistant message
            const lastAssistantMsg = this.messagesContainer.querySelector('.message.assistant:last-child');
            if (lastAssistantMsg) {
                lastAssistantMsg.remove();
            }
            
            // Resend the message
            this.processMessage(lastUserMessage);
        }
    }

    scrollToBottom() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.scrollTop = mainContent.scrollHeight;
        }
    }

    setStreamingState(isStreaming) {
        this.isStreaming = isStreaming;
        this.heroSendButton.disabled = isStreaming || !this.heroMessageInput.value.trim();
        this.sendButton.disabled = isStreaming || !this.messageInput.value.trim();
        this.heroMessageInput.disabled = isStreaming;
        this.messageInput.disabled = isStreaming;
    }
    
    autoFocusPrompt() {
        // Auto-focus on prompt input field only on desktop (screens wider than 768px)
        if (window.innerWidth > 768) {
            // Small delay to ensure DOM is fully ready
            setTimeout(() => {
                if (this.welcomeView.style.display !== 'none' && this.heroMessageInput) {
                    this.heroMessageInput.focus();
                } else if (this.chatView.style.display !== 'none' && this.messageInput) {
                    this.messageInput.focus();
                }
            }, 100);
        }
    }
    
    checkAuthStatus() {
        // Check if user is logged in
        this.authToken = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        const userEmail = localStorage.getItem('userEmail');
        const userName = localStorage.getItem('userName');
        
        const authButtons = document.getElementById('authButtons');
        const greetingContainer = document.getElementById('greetingContainer');
        const userNameElement = document.querySelector('.user-name');
        
        if (this.authToken && userId) {
            // User is logged in
            this.user = { id: userId, email: userEmail, name: userName };
            
            // Show greeting, hide auth buttons
            if (authButtons) authButtons.style.display = 'none';
            if (greetingContainer) greetingContainer.style.display = 'flex';
            
            // Update user name
            if (userNameElement && userName) {
                userNameElement.textContent = userName.split(' ')[0] || 'User';
            }
            
            // Set up greeting
            this.updateGreeting();
            
            // Set up user dropdown
            this.setupUserDropdown();
        } else {
            // User is not logged in
            this.user = null;
            
            // Show auth buttons, hide greeting
            if (authButtons) authButtons.style.display = 'flex';
            if (greetingContainer) greetingContainer.style.display = 'none';
        }
    }
    
    updateGreeting() {
        const greetingElement = document.getElementById('greeting');
        if (!greetingElement) return;
        
        const hour = new Date().getHours();
        let greeting = 'Hello';
        
        if (hour < 12) greeting = 'Good morning';
        else if (hour < 17) greeting = 'Good afternoon';
        else greeting = 'Good evening';
        
        greetingElement.textContent = greeting + ',';
    }
    
    setupUserDropdown() {
        const userMenuBtn = document.getElementById('userMenuBtn');
        const userDropdown = document.getElementById('userDropdown');
        
        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                userDropdown.classList.remove('show');
            });
            
            // Prevent dropdown from closing when clicking inside
            userDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        // Add logout handler for 3-dot menu logout button
        const logoutMenuItem = document.getElementById('logoutMenuItem');
        if (logoutMenuItem) {
            logoutMenuItem.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.logout();
            });
        }
    }
    
    async logout() {
        // Clear auth data from localStorage
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        
        // Sign out from Supabase if available
        if (window.supabase) {
            try {
                await window.supabase.auth.signOut();
            } catch (error) {
                console.error('Supabase signOut error:', error);
            }
        }
        
        // Clear all localStorage to ensure clean state
        localStorage.clear();
        
        // Reload page to reset state
        window.location.reload();
    }
    
    // Check if model requires authentication
    isModelRestricted(model) {
        const freeModels = ['openai/gpt-oss-20b:free', 'moonshotai/kimi-k2:free', 'deepseek/deepseek-r1-0528:free'];
        return !this.user && !freeModels.includes(model);
    }
}

// Global function for copying code blocks
window.copyCodeBlock = function(codeId, button) {
    const codeElement = document.getElementById(codeId);
    if (codeElement) {
        const codeText = codeElement.textContent;
        navigator.clipboard.writeText(codeText).then(() => {
            // Update button to show copied state
            button.classList.add('copied');
            button.innerHTML = '<i class="fas fa-check"></i><span>Copied!</span>';
            
            // Reset after 2 seconds
            setTimeout(() => {
                button.classList.remove('copied');
                button.innerHTML = '<i class="fas fa-copy"></i><span>Copy code</span>';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy code:', err);
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
});