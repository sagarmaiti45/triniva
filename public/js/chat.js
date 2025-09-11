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
        this.init();
    }
    
    async init() {
        await this.checkAuthStatus();
        this.initSession();
        this.bindEvents();
        this.enableSendButtons();
        this.autoFocusPrompt();
        
        // Check if we're on a chat URL and load that conversation
        this.handleInitialRoute();
    }
    
    async handleInitialRoute() {
        const path = window.location.pathname;
        
        // If we're on a chat URL, try to load that conversation
        if (path.startsWith('/chat/')) {
            const chatId = path.split('/chat/')[1];
            if (chatId) {
                // Store the chat ID to load
                this.pendingChatId = chatId;
                
                // Wait for chat manager to be ready and load the conversation
                const loadChat = async () => {
                    if (window.chatManager && window.chatManager.initialized) {
                        try {
                            // Try to load the conversation
                            await window.chatManager.loadConversation(chatId);
                            this.currentConversationId = chatId;
                        } catch (error) {
                            console.error('Failed to load chat from URL:', error);
                            // If loading fails, redirect to home
                            window.history.replaceState({}, '', '/');
                            if (this.welcomeView && this.chatView) {
                                this.welcomeView.style.display = 'flex';
                                this.chatView.style.display = 'none';
                            }
                        }
                    } else {
                        // Retry after a short delay
                        setTimeout(loadChat, 100);
                    }
                };
                
                // Start trying to load the chat
                setTimeout(loadChat, 500);
            }
        }
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
        
        // Initialize cookie consent
        this.initCookieConsent();
        
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
        // Handle browser back/forward navigation
        window.addEventListener('popstate', (e) => {
            const path = window.location.pathname;
            
            // If we're back to the homepage
            if (path === '/' || path === '') {
                // Reset to welcome view
                this.showWelcomeView();
                this.currentConversationId = null;
                
                // Clear messages from chat view
                this.chatMessages.innerHTML = '';
                
                // Clear any input fields and reset heights
                this.messageInput.value = '';
                this.heroMessageInput.value = '';
                this.messageInput.style.height = 'auto';
                this.heroMessageInput.style.height = 'auto';
                
                // Remove active state from sidebar conversations
                document.querySelectorAll('.conversation-item').forEach(item => {
                    item.classList.remove('active');
                });
            }
            // If we're on a chat URL
            else if (path.startsWith('/chat/')) {
                const chatId = path.split('/chat/')[1];
                if (chatId && this.conversations.find(c => c.id === chatId)) {
                    this.loadConversation(chatId);
                }
            }
        });
        
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

        // New chat button - redirects to homepage
        this.newChatBtn.addEventListener('click', () => {
            // Redirect to homepage for new chat
            window.location.href = '/';
        });

        // Sidebar toggle button
        this.sidebarToggle.addEventListener('click', () => {
            this.toggleSidebar();
        });
        
        // Mobile model button - toggle the dropdown
        if (this.modelButtonMobile) {
            this.modelButtonMobile.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.customDropdown) {
                    const isOpen = this.customDropdown.classList.contains('open');
                    this.closeAllModals();
                    if (!isOpen) {
                        this.customDropdown.classList.add('open');
                    }
                }
            });
        }
        
        // Mobile menu toggle
        if (this.mobileMenuToggle) {
            this.mobileMenuToggle.addEventListener('click', () => {
                this.toggleMobileSidebar();
            });
        }
        
        // Sidebar overlay click handler
        const overlay = document.getElementById('sidebarOverlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                this.closeMobileSidebar();
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
        
        // Handle overlay
        const overlay = document.getElementById('sidebarOverlay');
        if (overlay) {
            if (this.sidebar.classList.contains('open')) {
                overlay.style.display = 'block';
                // Force reflow to ensure transition works
                overlay.offsetHeight;
                overlay.classList.add('active');
            } else {
                overlay.classList.remove('active');
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 300); // Match transition duration
            }
        }
    }
    
    closeMobileSidebar() {
        this.sidebar.classList.remove('open');
        if (this.mobileMenuToggle) {
            this.mobileMenuToggle.classList.remove('active');
        }
        
        // Handle overlay
        const overlay = document.getElementById('sidebarOverlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300); // Match transition duration
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
            const isOpen = this.customDropdown.classList.contains('open');
            this.closeAllModals();
            if (!isOpen) {
                this.customDropdown.classList.add('open');
            }
        });
        
        // Handle scrollbar visibility for dropdown menu
        let scrollTimeout;
        this.dropdownMenu.addEventListener('scroll', () => {
            // Add scrolling class to show scrollbar
            this.dropdownMenu.classList.add('scrolling');
            
            // Clear existing timeout
            clearTimeout(scrollTimeout);
            
            // Hide scrollbar after scroll stops
            scrollTimeout = setTimeout(() => {
                this.dropdownMenu.classList.remove('scrolling');
            }, 500); // Faster hide for cleaner look
        });
        
        // Handle item selection
        this.dropdownMenu.addEventListener('click', (e) => {
            const item = e.target.closest('.custom-model-dropdown-item');
            if (!item) return;
            
            const value = item.dataset.value;
            const model = this.modelConfig.find(m => m.value === value);
            
            // Check if user can use this model
            if (!this.canUserUseModel(value)) {
                this.showModelRestrictionPopup(value, model);
                return;
            }
            
            if (model) {
                // Check if user can use this model
                const isAvailable = model.isFree || this.authToken;
                
                if (!isAvailable) {
                    // Show login prompt for paid models
                    if (confirm('This model requires authentication. Would you like to login now?')) {
                        window.location.href = '/auth/login';
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
        // Hero attach button - toggle functionality
        if (this.heroAttachButton) {
            this.heroAttachButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = this.heroAttachMenu && this.heroAttachMenu.classList.contains('show');
                this.closeAllModals();
                if (!isOpen) {
                    this.toggleAttachMenu('hero');
                }
            });
        }
        
        // Chat attach button - toggle functionality
        if (this.chatAttachButton) {
            this.chatAttachButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = this.chatAttachMenu && this.chatAttachMenu.classList.contains('show');
                this.closeAllModals();
                if (!isOpen) {
                    this.toggleAttachMenu('chat');
                }
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
    
    canUserUseModel(modelId) {
        // Get user plan (guest, free, starter, pro, business)
        let userPlan = 'guest';
        if (this.authToken) {
            // Get from stored profile
            const storedProfile = localStorage.getItem('userProfile');
            if (storedProfile) {
                try {
                    const profile = JSON.parse(storedProfile);
                    userPlan = profile.plan || 'free';
                } catch (e) {
                    // Fallback to legacy storage
                    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                    userPlan = storedUser.plan || 'free';
                }
            } else {
                userPlan = 'free'; // Default for authenticated users without profile
            }
        }
        
        // Free models - available to everyone
        const freeModels = [
            'openai/gpt-oss-20b:free',
            'moonshotai/kimi-k2:free', 
            'meta-llama/llama-4-maverick:free',
            'deepseek/deepseek-r1-0528:free'
        ];
        
        if (freeModels.includes(modelId)) {
            return true;
        }
        
        // Guest users can only use free models
        if (userPlan === 'guest') {
            return false;
        }
        
        // Premium models - only pro and business
        const premiumModels = [
            'openai/gpt-5',
            'anthropic/claude-sonnet-4',
            'x-ai/grok-4',
            'anthropic/claude-3.5-haiku'
        ];
        
        if (premiumModels.includes(modelId)) {
            return userPlan === 'pro' || userPlan === 'business';
        }
        
        // Budget/Mid models - starter and above
        return userPlan !== 'free';
    }
    
    showModelRestrictionPopup(modelId, model) {
        let userPlan = 'guest';
        if (this.authToken) {
            const storedProfile = localStorage.getItem('userProfile');
            if (storedProfile) {
                try {
                    const profile = JSON.parse(storedProfile);
                    userPlan = profile.plan || 'free';
                } catch (e) {
                    userPlan = 'free';
                }
            } else {
                userPlan = 'free';
            }
        }
        
        let title = '';
        let message = '';
        let actionButton = '';
        
        if (userPlan === 'guest') {
            title = 'Sign In Required';
            message = `<p>The <strong>${model.label}</strong> model requires authentication.</p><p>Please sign in or create an account to access premium AI models.</p>`;
            actionButton = `
                <div class="popup-actions">
                    <button class="popup-btn secondary" onclick="this.closest('.model-restriction-popup').remove()">Cancel</button>
                    <a href="/auth/login" class="popup-btn primary">
                        <i class="fas fa-sign-in-alt"></i> Sign In
                    </a>
                </div>`;
        } else {
            const premiumModels = ['openai/gpt-5', 'anthropic/claude-sonnet-4', 'x-ai/grok-4', 'anthropic/claude-3.5-haiku'];
            const isPremium = premiumModels.includes(modelId);
            
            if (isPremium && (userPlan === 'free' || userPlan === 'starter')) {
                title = 'Upgrade Required';
                message = `<p>The <strong>${model.label}</strong> model is only available on <strong>Pro</strong> and <strong>Business</strong> plans.</p><p>Upgrade your plan to access premium AI models with advanced capabilities.</p>`;
                actionButton = `
                    <div class="popup-actions">
                        <button class="popup-btn secondary" onclick="this.closest('.model-restriction-popup').remove()">Cancel</button>
                        <a href="/plans" class="popup-btn primary">
                            <i class="fas fa-crown"></i> Upgrade Plan
                        </a>
                    </div>`;
            } else if (userPlan === 'free') {
                title = 'Upgrade Required';
                message = `<p>The <strong>${model.label}</strong> model is only available on paid plans.</p><p>Upgrade to <strong>Starter</strong>, <strong>Pro</strong>, or <strong>Business</strong> to access this model.</p>`;
                actionButton = `
                    <div class="popup-actions">
                        <button class="popup-btn secondary" onclick="this.closest('.model-restriction-popup').remove()">Cancel</button>
                        <a href="/plans" class="popup-btn primary">
                            <i class="fas fa-rocket"></i> Upgrade Plan
                        </a>
                    </div>`;
            }
        }
        
        // Create popup
        const popup = document.createElement('div');
        popup.className = 'model-restriction-popup';
        popup.innerHTML = `
            <div class="popup-overlay" onclick="this.closest('.model-restriction-popup').remove()"></div>
            <div class="popup-content">
                <div class="popup-header">
                    <div class="popup-icon">
                        <i class="fas fa-lock"></i>
                    </div>
                    <h3>${title}</h3>
                </div>
                <div class="popup-body">
                    ${message}
                </div>
                ${actionButton}
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Show with animation
        setTimeout(() => popup.classList.add('show'), 10);
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
        const logoutMenuItem = document.getElementById('logoutMenuItem');
        
        if (!menuButton || !menuDropdown) return;
        
        // Toggle menu on button click
        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = menuDropdown.classList.contains('show');
            this.closeAllModals();
            if (!isOpen) {
                menuDropdown.classList.add('show');
            }
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
                window.location.href = '/auth/signup';
            });
        }
        
        // Handle logout button click
        if (logoutMenuItem) {
            logoutMenuItem.addEventListener('click', async () => {
                await this.logout();
                menuDropdown.classList.remove('show');
            });
        }
        
        // Update menu items visibility
        this.updateMainMenuItems();
    }
    
    updateMainMenuItems() {
        const shareMenuItem = document.getElementById('shareMenuItem');
        const signupMenuItem = document.getElementById('signupMenuItem');
        const logoutMenuItem = document.getElementById('logoutMenuItem');
        const menuDivider = document.getElementById('menuDivider');
        const logoutDivider = document.getElementById('logoutDivider');
        
        // Show share button only in chat view
        if (shareMenuItem) {
            const isInChatView = this.chatView && this.chatView.style.display !== 'none';
            shareMenuItem.style.display = isInChatView ? 'flex' : 'none';
        }
        
        // Show login/signup items only if not logged in
        const isLoggedIn = !!this.authToken;
        const loginMenuItem = document.getElementById('loginMenuItem');
        const authDivider = document.getElementById('authDivider');
        
        console.log('Updating main menu items:', {
            isLoggedIn: isLoggedIn,
            authToken: this.authToken,
            loginMenuItem: !!loginMenuItem,
            signupMenuItem: !!signupMenuItem,
            logoutMenuItem: !!logoutMenuItem,
            menuDivider: !!menuDivider
        });
        
        // Show login/signup for non-logged in users
        if (loginMenuItem) {
            loginMenuItem.style.display = isLoggedIn ? 'none' : 'flex';
        }
        
        if (signupMenuItem) {
            signupMenuItem.style.display = isLoggedIn ? 'none' : 'flex';
            console.log('Signup menu item display set to:', signupMenuItem.style.display);
        }
        
        if (authDivider) {
            authDivider.style.display = isLoggedIn ? 'none' : 'block';
        }
        
        if (menuDivider) {
            menuDivider.style.display = 'none'; // Hide old divider
        }
        
        // Show logout button only if logged in
        if (logoutMenuItem) {
            logoutMenuItem.style.display = isLoggedIn ? 'flex' : 'none';
            console.log('Logout menu item display set to:', logoutMenuItem.style.display);
        }
        
        // Show logout divider only if logged in (appears above logout)
        if (logoutDivider) {
            logoutDivider.style.display = isLoggedIn ? 'block' : 'none';
        }
    }
    
    // Global modal management - close all open modals/dropdowns
    closeAllModals() {
        // Close user dropdown
        const userDropdown = document.getElementById('userDropdown');
        if (userDropdown) {
            userDropdown.classList.remove('show');
        }
        
        // Close mobile user dropdown
        const mobileUserDropdown = document.getElementById('mobileUserDropdown');
        if (mobileUserDropdown) {
            mobileUserDropdown.classList.remove('show');
        }
        
        // Close main menu dropdown (3-dot menu)
        const mainMenuDropdown = document.getElementById('mainMenuDropdown');
        if (mainMenuDropdown) {
            mainMenuDropdown.classList.remove('show');
        }
        
        // Close attach menus and reset button states
        this.closeAllAttachMenus();
        
        // Close custom model dropdown
        const customDropdown = document.getElementById('customModelDropdown');
        if (customDropdown) {
            customDropdown.classList.remove('open');
        }
        
        // Close any other modals like attach menu
        const heroAttachMenu = document.getElementById('heroAttachMenu');
        if (heroAttachMenu) {
            heroAttachMenu.classList.remove('show');
        }
        
        const chatAttachMenu = document.getElementById('chatAttachMenu');
        if (chatAttachMenu) {
            chatAttachMenu.classList.remove('show');
        }
        
        // Close model restriction popups if any
        const restrictionPopups = document.querySelectorAll('.model-restriction-popup');
        restrictionPopups.forEach(popup => {
            popup.remove();
        });
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

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    switchToChatView() {
        this.welcomeView.style.display = 'none';
        this.chatView.style.display = 'flex';
        document.getElementById('chatHeader').style.display = 'flex';
        
        // We're now in chat view, not the first message anymore
        this.isFirstMessage = false;
        
        // Add class to auth buttons container for proper spacing
        const authContainer = document.querySelector('.auth-buttons-container');
        if (authContainer) {
            authContainer.classList.add('in-chat-view');
        }
        
        // Update main menu items
        this.updateMainMenuItems();
        
        this.isFirstMessage = false;
        
        // Keep greeting visible for logged-in users in chat view
        const greetingContainer = document.querySelector('.greeting-container');
        if (greetingContainer && !this.user) {
            // Only hide greeting if user is not logged in
            greetingContainer.style.display = 'none';
        }
        
        // Auto-focus on chat input for desktop
        this.autoFocusPrompt();
    }
    
    showWelcomeView() {
        this.welcomeView.style.display = 'flex';
        this.chatView.style.display = 'none';
        document.getElementById('chatHeader').style.display = 'none';
        
        // Reset first message flag
        this.isFirstMessage = true;
        
        // Reset hero textarea height to default
        if (this.heroMessageInput) {
            this.heroMessageInput.style.height = 'auto';
        }
        
        // Remove class from auth buttons container
        const authContainer = document.querySelector('.auth-buttons-container');
        if (authContainer) {
            authContainer.classList.remove('in-chat-view');
        }
        
        // Update main menu items
        this.updateMainMenuItems();
        
        this.isFirstMessage = true;
        
        // Show greeting container
        const greetingContainer = document.querySelector('.greeting-container');
        if (greetingContainer) {
            greetingContainer.style.display = '';
        }
        
        // Reset any streaming state
        this.isStreaming = false;
        this.setStreamingState(false);
        
        // Auto-focus on hero input for desktop
        if (!this.isMobileDevice()) {
            this.heroMessageInput.focus();
        }
    }

    createNewConversation() {
        // Reset to homepage
        window.history.pushState({}, '', '/');
        this.showWelcomeView();
        this.currentConversationId = null;
        
        // Clear messages
        this.chatMessages.innerHTML = '';
        
        // Clear input fields and reset heights
        this.messageInput.value = '';
        this.heroMessageInput.value = '';
        this.messageInput.style.height = 'auto';
        this.heroMessageInput.style.height = 'auto';
        
        // Clear attached images
        this.clearAttachedImages('hero');
        this.clearAttachedImages('chat');
        
        // Remove active state from sidebar conversations
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Reset first message flag
        this.isFirstMessage = true;
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
            
            // Show greeting for logged-in users
            const greetingContainer = document.querySelector('.greeting-container');
            if (greetingContainer && this.user) {
                greetingContainer.style.display = 'flex';
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
        // If using chat manager, let it handle the sidebar - don't duplicate
        if (window.chatManager && window.chatManager.initialized) {
            // Just update the title in chat manager if needed
            const currentConv = this.conversations.find(c => c.id === this.currentConversationId);
            if (currentConv && window.chatManager.currentConversationId === this.currentConversationId) {
                window.chatManager.updateConversationTitle(this.currentConversationId, currentConv.title);
            }
            return;
        }

        // Original code for when not using chat manager (fallback)
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

        // Create new conversation if this is the first message
        if (!this.currentConversationId) {
            // Generate a UUID for the conversation
            const conversationId = this.generateUUID();
            this.currentConversationId = conversationId;
            
            // Create a new conversation
            const conversation = {
                id: conversationId,
                title: message.substring(0, 30) + (message.length > 30 ? '...' : ''),
                messages: [],
                model: this.modelSelect.value,
                createdAt: new Date().toISOString()
            };
            this.conversations.push(conversation);
            
            // Update URL with the new chat ID
            window.history.pushState({}, '', `/chat/${conversationId}`);
            
            // If using chat manager, create in database (works for both guest and authenticated users)
            if (window.chatManager) {
                const title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
                await window.chatManager.createConversation(title, this.modelSelect.value, conversationId);
                window.chatManager.currentConversationId = conversationId;
                this.isFirstMessage = false;
            }
        }

        // Switch to chat view
        this.switchToChatView();
        
        // Save images before clearing
        const images = [...this.attachedImages];
        
        // Add user message with images
        this.addMessage(message || "What's in this image?", 'user', false, false, this.attachedImages);
        
        // Save user message to database if using chat manager (works for both guest and authenticated users)
        if (window.chatManager && this.currentConversationId) {
            await window.chatManager.saveMessage(message || "What's in this image?", 'user');
        }
        
        // Clear hero input and images
        this.heroMessageInput.value = '';
        this.adjustTextareaHeight(this.heroMessageInput);
        this.clearAttachedImages('hero');
        
        // Process message with images
        await this.processMessage(message || "What's in this image?", images);
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        const hasImages = this.attachedImages.length > 0;
        
        if ((!message && !hasImages) || this.isStreaming) return;

        // Save user message to database if using chat manager and conversation exists
        if (window.chatManager && this.currentConversationId) {
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
            this.addMessage('⚠️ This model requires authentication. Please [login](/auth/login) or [sign up](/auth/signup) to use paid models, or switch to a free model.', 'assistant');
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
                    chatId: this.currentConversationId || this.sessionId,
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
    
    async checkAuthStatus() {
        // Check if user is logged in via localStorage first
        this.authToken = localStorage.getItem('authToken');
        let userId = localStorage.getItem('userId');
        let userEmail = localStorage.getItem('userEmail');
        let userName = localStorage.getItem('userName');
        
        // If no localStorage auth, check Supabase auth
        if (window.supabase && (!this.authToken || !userId)) {
            try {
                const { data: { session } } = await window.supabase.auth.getSession();
                if (session && session.user) {
                    this.authToken = session.access_token;
                    userId = session.user.id;
                    userEmail = session.user.email;
                    userName = session.user.user_metadata?.full_name || session.user.email;
                    
                    // Store in localStorage for consistency
                    localStorage.setItem('authToken', this.authToken);
                    localStorage.setItem('userId', userId);
                    localStorage.setItem('userEmail', userEmail);
                    localStorage.setItem('userName', userName);
                    
                    console.log('Found Supabase session, stored in localStorage');
                }
            } catch (error) {
                console.error('Error checking Supabase session:', error);
            }
        }
        
        // Debug logging
        console.log('Auth Status Check:', {
            authToken: this.authToken ? 'Present' : 'Missing',
            userId: userId,
            userEmail: userEmail,
            userName: userName,
            supabaseAvailable: !!window.supabase
        });
        
        const authButtons = document.getElementById('authButtons');
        const greetingContainer = document.getElementById('greetingContainer');
        const userNameElement = document.querySelector('.user-name');
        const mobileUserMenuBtn = document.getElementById('mobileUserMenuBtn');
        
        // Debug UI elements
        console.log('UI Elements Found:', {
            authButtons: !!authButtons,
            greetingContainer: !!greetingContainer,
            userNameElement: !!userNameElement,
            mobileUserMenuBtn: !!mobileUserMenuBtn
        });
        
        if (this.authToken && userId) {
            console.log('User is logged in, updating UI...');
            // User is logged in
            this.user = { id: userId, email: userEmail, name: userName };
            
            // Load user profile with plan info
            await this.loadUserProfile();
            
            // Show greeting, hide auth buttons
            if (authButtons) authButtons.style.display = 'none';
            if (greetingContainer) {
                greetingContainer.style.display = 'flex';
                // Keep greeting visible on homepage
                greetingContainer.classList.add('logged-in');
            }
            
            // Show mobile user menu button on mobile
            if (mobileUserMenuBtn) {
                mobileUserMenuBtn.classList.add('show');
                mobileUserMenuBtn.style.display = '';
                
                // Add click handler for mobile user menu
                mobileUserMenuBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const mobileDropdown = document.getElementById('mobileUserDropdown');
                    if (mobileDropdown) {
                        const isOpen = mobileDropdown.classList.contains('show');
                        this.closeAllModals();
                        if (!isOpen) {
                            mobileDropdown.classList.add('show');
                        }
                    }
                });
                
                // Close mobile dropdown when clicking outside
                document.addEventListener('click', () => {
                    const mobileDropdown = document.getElementById('mobileUserDropdown');
                    if (mobileDropdown) {
                        mobileDropdown.classList.remove('show');
                    }
                });
                
                // Mobile logout removed - logout is now handled via 3-dot menu only
            }
            
            // Update user name
            if (userNameElement && userName) {
                userNameElement.textContent = userName.split(' ')[0] || 'User';
            }
            
            // Set up greeting
            this.updateGreeting();
            
            // Set up user dropdown
            this.setupUserDropdown();
            
            // Update main menu items to show logout
            this.updateMainMenuItems();
        } else {
            console.log('User is NOT logged in, showing auth buttons...');
            // User is not logged in
            this.user = null;
            
            // Show auth buttons, hide greeting
            if (authButtons) authButtons.style.display = 'flex';
            if (greetingContainer) greetingContainer.style.display = 'none';
            
            // Update main menu items to show signup
            this.updateMainMenuItems();
        }
    }
    
    async loadUserProfile() {
        if (!this.authToken) return null;
        
        try {
            const response = await fetch('/api/user/profile', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const userProfile = {
                    plan: data.profile?.subscription_tier || 'free',
                    credits: data.profile?.token_balance || 0,
                    ...data.profile
                };
                
                // Store user profile in localStorage for quick access
                localStorage.setItem('userProfile', JSON.stringify(userProfile));
                
                console.log('[Profile] User plan loaded:', userProfile.plan);
                return userProfile;
            }
        } catch (error) {
            console.error('[Profile] Failed to load user profile:', error);
        }
        return null;
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
                const isOpen = userDropdown.classList.contains('show');
                this.closeAllModals();
                if (!isOpen) {
                    userDropdown.classList.add('show');
                }
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
        
        // User dropdown logout removed - logout is now handled via 3-dot menu only
        
        // Add logout handler for 3-dot menu logout button (already handled in initMainMenu)
        // Kept here for backward compatibility
        const logoutMenuItem = document.getElementById('logoutMenuItem');
        if (logoutMenuItem && !logoutMenuItem.hasAttribute('data-listener-attached')) {
            logoutMenuItem.setAttribute('data-listener-attached', 'true');
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

    // Cookie Consent Management
    initCookieConsent() {
        const cookieConsent = document.getElementById('cookieConsent');
        const acceptBtn = document.getElementById('cookieAccept');
        const rejectBtn = document.getElementById('cookieReject');
        
        // Check if user has already made a choice
        const cookieChoice = localStorage.getItem('cookieConsent');
        
        // Show banner if no choice has been made
        if (!cookieChoice && cookieConsent) {
            setTimeout(() => {
                cookieConsent.classList.add('show');
            }, 2000); // Show after 2 seconds
        }
        
        // Handle accept button
        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => {
                localStorage.setItem('cookieConsent', 'accepted');
                localStorage.setItem('cookieConsentTime', new Date().toISOString());
                cookieConsent.classList.remove('show');
                this.enableAnalytics();
            });
        }
        
        // Handle reject button
        if (rejectBtn) {
            rejectBtn.addEventListener('click', () => {
                localStorage.setItem('cookieConsent', 'rejected');
                localStorage.setItem('cookieConsentTime', new Date().toISOString());
                cookieConsent.classList.remove('show');
                this.disableAnalytics();
            });
        }
        
        // Initialize analytics based on saved choice
        if (cookieChoice === 'accepted') {
            this.enableAnalytics();
        }
    }
    
    enableAnalytics() {
        // Enable analytics cookies and tracking
        console.log('Analytics enabled');
        // Add your analytics initialization code here
        // Example: Google Analytics, Mixpanel, etc.
    }
    
    disableAnalytics() {
        // Disable analytics and remove cookies
        console.log('Analytics disabled');
        // Add code to disable analytics and clear cookies
    }
}

// Test function to simulate login (for debugging)
window.testLogin = function() {
    localStorage.setItem('authToken', 'test-token-123');
    localStorage.setItem('userId', 'test-user-id');
    localStorage.setItem('userEmail', 'test@example.com');
    localStorage.setItem('userName', 'Test User');
    
    // Re-check auth status
    if (window.chatApp) {
        window.chatApp.checkAuthStatus();
    }
    
    console.log('Test login data set. Refresh page or call window.chatApp.checkAuthStatus()');
}

// Test function to simulate logout (for debugging)
window.testLogout = function() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    
    // Re-check auth status
    if (window.chatApp) {
        window.chatApp.checkAuthStatus();
    }
    
    console.log('Test logout completed.');
}

// Function to refresh auth status
window.refreshAuth = function() {
    if (window.chatApp) {
        window.chatApp.checkAuthStatus();
        console.log('Auth status refreshed');
    } else {
        console.log('ChatApp not available yet');
    }
}

// Debug function to check all localStorage data
window.checkLocalStorage = function() {
    const allKeys = Object.keys(localStorage);
    const authRelated = {};
    
    allKeys.forEach(key => {
        if (key.includes('auth') || key.includes('user') || key.includes('token') || key.includes('User') || key.includes('Token')) {
            authRelated[key] = localStorage.getItem(key);
        }
    });
    
    console.log('All localStorage keys:', allKeys);
    console.log('Potential auth-related data:', authRelated);
    console.log('Expected keys:', {
        authToken: localStorage.getItem('authToken'),
        userId: localStorage.getItem('userId'),
        userEmail: localStorage.getItem('userEmail'),
        userName: localStorage.getItem('userName')
    });
    
    return authRelated;
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