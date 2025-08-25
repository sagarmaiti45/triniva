class DemoChat {
    constructor() {
        this.messageCounter = 0;
        this.isTyping = false;
        this.demoResponses = [
            "### Welcome to Demo Mode\n\nThis is a demo response from the AI assistant. You can test the interface with **bold text**, *italic text*, and various formatting options without making actual API calls!\n\n- Test markdown formatting\n- See code blocks in action\n- Experience the full UI",
            "I understand your message. In the real application, I would provide a more contextual response based on your input.",
            "Here's an example with code:\n\n```javascript\nfunction greet(name) {\n    console.log(`Hello, ${name}!`);\n    return `Welcome to Triniva AI`;\n}\n\ngreet('User');\n```\n\nThe code blocks support syntax highlighting!",
            "You can also use inline code like `const x = 42` within regular text. Pretty neat!",
            "Here's a CSS example:\n\n```css\n.button {\n    background: linear-gradient(45deg, #667eea, #764ba2);\n    color: white;\n    padding: 10px 20px;\n    border-radius: 8px;\n    transition: transform 0.2s;\n}\n\n.button:hover {\n    transform: scale(1.05);\n}\n```",
            "And here's some HTML:\n\n```html\n<!DOCTYPE html>\n<html>\n<head>\n    <title>Demo Page</title>\n</head>\n<body>\n    <h1>Welcome!</h1>\n    <p>This is a demo.</p>\n</body>\n</html>\n```",
            "Python example:\n\n```python\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n\n# Print first 10 Fibonacci numbers\nfor i in range(10):\n    print(fibonacci(i))\n```",
            "SQL query example:\n\n```sql\nSELECT users.name, orders.total\nFROM users\nINNER JOIN orders ON users.id = orders.user_id\nWHERE orders.total > 100\nORDER BY orders.total DESC;\n```",
            "You can test features like: scrolling, message history, typing indicators, and the overall chat flow.",
            "This demo environment helps developers and designers test changes without consuming API credits."
        ];
        
        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.sidebar = document.querySelector('.sidebar');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.newChatBtn = document.querySelector('.new-chat-btn');
        this.mobileMenuToggle = document.getElementById('mobileMenuToggle');
        this.sidebarCloseMobile = document.getElementById('sidebarCloseMobile');
    }

    bindEvents() {
        // Send message events
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.messageInput.addEventListener('input', () => {
            this.adjustTextareaHeight();
            this.updateSendButton();
        });

        // Sidebar toggle
        if (this.sidebarToggle) {
            this.sidebarToggle.addEventListener('click', () => {
                this.toggleSidebar();
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

        // New chat button
        this.newChatBtn.addEventListener('click', () => {
            this.clearChat();
        });

        // Demo conversation clicks
        document.querySelectorAll('.conversation-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.loadDemoConversation(index);
            });
        });
        
        // Click outside to close sidebar on mobile
        document.addEventListener('click', (e) => {
            if (this.sidebar && this.sidebar.classList.contains('open')) {
                const isClickInsideSidebar = this.sidebar.contains(e.target);
                const isClickOnMenuToggle = this.mobileMenuToggle && this.mobileMenuToggle.contains(e.target);
                
                if (!isClickInsideSidebar && !isClickOnMenuToggle) {
                    this.closeMobileSidebar();
                }
            }
        });
    }

    adjustTextareaHeight() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 200) + 'px';
    }

    updateSendButton() {
        const hasText = this.messageInput.value.trim().length > 0;
        this.sendButton.disabled = !hasText || this.isTyping;
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
        if (this.mobileMenuToggle) {
            this.mobileMenuToggle.classList.toggle('active');
        }
    }
    
    closeMobileSidebar() {
        this.sidebar.classList.remove('open');
        if (this.mobileMenuToggle) {
            this.mobileMenuToggle.classList.remove('active');
        }
    }

    sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isTyping) return;

        // Add user message
        this.addMessage(message, 'user');
        
        // Clear input
        this.messageInput.value = '';
        this.adjustTextareaHeight();
        this.updateSendButton();
        
        // Simulate AI response with typing
        this.simulateAIResponse();
    }

    simulateAIResponse() {
        this.isTyping = true;
        this.updateSendButton();
        
        // Add typing indicator
        const typingId = this.addMessage('', 'assistant', true);
        
        // Simulate typing delay (1-2 seconds)
        const typingDelay = 1000 + Math.random() * 1000;
        
        setTimeout(() => {
            // Remove typing indicator
            const typingElement = document.getElementById(typingId);
            if (typingElement) {
                typingElement.closest('.message').remove();
            }
            
            // Add actual response
            const response = this.getRandomResponse();
            this.addMessage(response, 'assistant');
            
            this.isTyping = false;
            this.updateSendButton();
            
            // Focus back on input
            this.messageInput.focus();
        }, typingDelay);
    }

    getRandomResponse() {
        // Cycle through responses or pick random
        const response = this.demoResponses[this.messageCounter % this.demoResponses.length];
        this.messageCounter++;
        return response;
    }

    addMessage(content, role, isTyping = false) {
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
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = `message-bubble${isTyping ? ' typing' : ''}`;
        bubbleDiv.id = messageId;
        
        if (isTyping) {
            bubbleDiv.innerHTML = '';
        } else if (role === 'assistant') {
            bubbleDiv.innerHTML = this.processMessageContent(content);
            // Apply syntax highlighting to code blocks
            setTimeout(() => {
                bubbleDiv.querySelectorAll('pre code').forEach(block => {
                    if (typeof Prism !== 'undefined') {
                        Prism.highlightElement(block);
                    }
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
                navigator.clipboard.writeText(content).then(() => {
                    console.log('Message copied to clipboard');
                });
            });
            
            actionsDiv.querySelector('.action-regenerate').addEventListener('click', () => {
                // In demo mode, just regenerate with a different response
                messageDiv.remove();
                this.simulateAIResponse();
            });
            
            contentDiv.appendChild(actionsDiv);
        }
        
        wrapperDiv.appendChild(contentDiv);
        messageDiv.appendChild(wrapperDiv);
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
        
        return messageId;
    }

    scrollToBottom() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.scrollTop = mainContent.scrollHeight;
        }
    }

    clearChat() {
        // Keep only the welcome message
        const messages = this.messagesContainer.querySelectorAll('.message');
        messages.forEach((msg, index) => {
            if (index > 0) msg.remove();
        });
        
        this.messageCounter = 0;
        this.messageInput.focus();
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
        // Process tables first
        content = this.processTables(content);
        
        // Process headings (### Heading)
        content = content.replace(/^### (.+)$/gm, '<h3 class="ai-heading">$1</h3>');
        content = content.replace(/^## (.+)$/gm, '<h2 class="ai-heading">$1</h2>');
        content = content.replace(/^# (.+)$/gm, '<h1 class="ai-heading">$1</h1>');
        
        // Process bold text (**text**)
        content = content.replace(/\*\*([^*]+)\*\*/g, '<strong class="ai-bold">$1</strong>');
        
        // Process italic text (*text*)
        content = content.replace(/\*([^*]+)\*/g, '<em class="ai-italic">$1</em>');
        
        // Process lists (- item)
        content = content.replace(/^- (.+)$/gm, '<li class="ai-list-item">$1</li>');
        
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
    
    loadDemoConversation(index) {
        this.clearChat();
        
        // Add some pre-populated messages based on conversation index
        const demoConversations = [
            [
                { role: 'user', content: 'Hello, can you help me with coding?' },
                { role: 'assistant', content: 'Of course! I\'d be happy to help you with coding. What programming language or specific problem are you working on?' },
                { role: 'user', content: 'I need help with JavaScript arrays' },
                { role: 'assistant', content: 'JavaScript arrays are versatile data structures. You can use methods like map(), filter(), reduce(), forEach() and many others. What specific array operation would you like to learn about?' }
            ],
            [
                { role: 'user', content: 'Explain machine learning in simple terms' },
                { role: 'assistant', content: 'Machine learning is like teaching a computer to recognize patterns and make decisions based on examples, rather than giving it explicit instructions. Imagine teaching a child to recognize cats - you show them many pictures of cats, and eventually they learn to identify cats on their own.' }
            ],
            [
                { role: 'user', content: 'What\'s the weather like today?' },
                { role: 'assistant', content: 'In demo mode, I can\'t access real weather data. In the live version, you could ask me about weather, and I would provide current conditions and forecasts based on your location.' }
            ]
        ];
        
        const conversation = demoConversations[index] || demoConversations[0];
        
        conversation.forEach((msg, i) => {
            setTimeout(() => {
                this.addMessage(msg.content, msg.role);
            }, i * 500);
        });
        
        // Update active conversation in sidebar
        document.querySelectorAll('.conversation-item').forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });
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

// Initialize demo chat when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new DemoChat();
});