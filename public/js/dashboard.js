// Dashboard Management System
class Dashboard {
    constructor() {
        this.authToken = localStorage.getItem('authToken');
        this.user = null;
        this.usage = [];
        this.conversations = [];
        
        if (!this.authToken) {
            window.location.href = '/auth/login.html';
            return;
        }
        
        this.init();
    }
    
    async init() {
        await this.loadUserProfile();
        await this.loadUsageStats();
        await this.loadConversations();
        this.bindEvents();
        this.startAutoRefresh();
    }
    
    async loadUserProfile() {
        try {
            const response = await fetch('/api/user/profile', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load profile');
            }
            
            const data = await response.json();
            this.user = data.profile;
            this.updateProfileUI();
        } catch (error) {
            console.error('Error loading profile:', error);
            this.showError('Failed to load profile');
        }
    }
    
    async loadUsageStats() {
        try {
            const response = await fetch('/api/user/usage', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load usage stats');
            }
            
            const data = await response.json();
            this.usage = data.usage;
            this.updateUsageChart();
        } catch (error) {
            console.error('Error loading usage:', error);
        }
    }
    
    async loadConversations() {
        try {
            const response = await fetch('/api/conversations', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load conversations');
            }
            
            const data = await response.json();
            this.conversations = data.conversations;
            this.updateConversationsList();
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }
    
    updateProfileUI() {
        if (!this.user) return;
        
        // Update user name
        const userNameElements = document.querySelectorAll('#userName, #userNameDisplay');
        userNameElements.forEach(el => {
            if (el) el.textContent = this.user.full_name || this.user.email || 'User';
        });
        
        // Update stats cards
        this.updateStatsCards();
        
        // Show/hide skeleton loaders
        const skeleton = document.getElementById('statsGridSkeleton');
        const statsGrid = document.getElementById('statsGrid');
        if (skeleton) skeleton.style.display = 'none';
        if (statsGrid) statsGrid.style.display = 'grid';
    }
    
    updateStatsCards() {
        const statsHTML = `
            <div class="stat-card">
                <div class="stat-icon credits">
                    <i class="fas fa-coins"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${(this.user.token_balance || 0).toLocaleString()}</div>
                    <div class="stat-label">Credits Remaining</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${this.calculateCreditsPercentage()}%"></div>
                    </div>
                    <div class="stat-detail">${this.getCreditsMessage()}</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon plan">
                    <i class="fas fa-crown"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${(this.user.subscription_tier || 'free').toUpperCase()}</div>
                    <div class="stat-label">Current Plan</div>
                    <div class="stat-detail">${this.getPlanDetails()}</div>
                    ${this.user.subscription_tier === 'free' ? 
                        '<a href="/plans" class="upgrade-link">Upgrade Plan <i class="fas fa-arrow-right"></i></a>' : 
                        '<a href="/dashboard/billing.html" class="manage-link">Manage Plan</a>'}
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon usage">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${(this.user.total_credits_used || 0).toLocaleString()}</div>
                    <div class="stat-label">Total Credits Used</div>
                    <div class="stat-detail">Since ${this.formatDate(this.user.created_at)}</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon chats">
                    <i class="fas fa-comments"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${(this.user.total_chats || 0).toLocaleString()}</div>
                    <div class="stat-label">Total Conversations</div>
                    <div class="stat-detail">
                        <a href="#conversations" class="view-link">View All <i class="fas fa-arrow-right"></i></a>
                    </div>
                </div>
            </div>
        `;
        
        const statsGrid = document.getElementById('statsGrid');
        if (statsGrid) {
            statsGrid.innerHTML = statsHTML;
        }
    }
    
    calculateCreditsPercentage() {
        const planLimits = {
            free: 1000,
            starter: 10000,
            pro: 30000,
            business: 80000
        };
        
        const limit = planLimits[this.user.subscription_tier] || 1000;
        return Math.min(100, Math.round((this.user.token_balance / limit) * 100));
    }
    
    getCreditsMessage() {
        const percentage = this.calculateCreditsPercentage();
        if (percentage > 50) {
            return `${percentage}% of monthly allocation remaining`;
        } else if (percentage > 20) {
            return `⚠️ ${percentage}% remaining - consider upgrading`;
        } else {
            return `⚠️ Low balance - ${percentage}% remaining`;
        }
    }
    
    getPlanDetails() {
        const planDetails = {
            free: '1,000 credits/month • Free models only',
            starter: '10,000 credits/month • 12 models',
            pro: '30,000 credits/month • All 16 models',
            business: '80,000 credits/month • Priority support'
        };
        
        return planDetails[this.user.subscription_tier] || 'Basic access';
    }
    
    updateUsageChart() {
        const chartContainer = document.getElementById('usageChart');
        if (!chartContainer || this.usage.length === 0) return;
        
        // Group usage by date
        const usageByDate = {};
        this.usage.forEach(item => {
            const date = new Date(item.date).toLocaleDateString();
            if (!usageByDate[date]) {
                usageByDate[date] = 0;
            }
            usageByDate[date] += item.credits_used;
        });
        
        // Create simple bar chart
        const dates = Object.keys(usageByDate).slice(-7); // Last 7 days
        const maxUsage = Math.max(...Object.values(usageByDate));
        
        let chartHTML = '<div class="usage-chart">';
        dates.forEach(date => {
            const usage = usageByDate[date];
            const height = maxUsage > 0 ? (usage / maxUsage) * 100 : 0;
            chartHTML += `
                <div class="chart-bar">
                    <div class="bar-fill" style="height: ${height}%" title="${usage.toLocaleString()} credits">
                        <span class="bar-value">${this.formatNumber(usage)}</span>
                    </div>
                    <div class="bar-label">${this.formatChartDate(date)}</div>
                </div>
            `;
        });
        chartHTML += '</div>';
        
        chartContainer.innerHTML = chartHTML;
    }
    
    updateConversationsList() {
        const container = document.getElementById('conversationsList');
        if (!container) return;
        
        if (this.conversations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <p>No conversations yet</p>
                    <a href="/" class="btn btn-primary">Start Chatting</a>
                </div>
            `;
            return;
        }
        
        let html = '<div class="conversations-grid">';
        this.conversations.slice(0, 10).forEach(conv => {
            html += `
                <div class="conversation-card">
                    <div class="conversation-header">
                        <h3>${this.escapeHtml(conv.title)}</h3>
                        <div class="conversation-actions">
                            <a href="/chat/${conv.id}" class="action-btn" title="Open">
                                <i class="fas fa-external-link-alt"></i>
                            </a>
                            <button class="action-btn delete-btn" data-id="${conv.id}" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="conversation-meta">
                        <span class="meta-item">
                            <i class="fas fa-clock"></i>
                            ${this.formatRelativeTime(conv.updated_at)}
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-message"></i>
                            ${conv.message_count || 0} messages
                        </span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        if (this.conversations.length > 10) {
            html += `
                <div class="view-all-container">
                    <a href="/conversations" class="btn btn-secondary">
                        View All Conversations (${this.conversations.length})
                    </a>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // Bind delete buttons
        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.deleteConversation(btn.dataset.id);
            });
        });
    }
    
    async deleteConversation(conversationId) {
        if (!confirm('Are you sure you want to delete this conversation?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/chat/${conversationId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete conversation');
            }
            
            // Remove from local list and update UI
            this.conversations = this.conversations.filter(c => c.id !== conversationId);
            this.updateConversationsList();
            this.showSuccess('Conversation deleted');
        } catch (error) {
            console.error('Error deleting conversation:', error);
            this.showError('Failed to delete conversation');
        }
    }
    
    bindEvents() {
        // User menu dropdown
        const userMenuBtn = document.getElementById('userMenuBtn');
        const userDropdown = document.getElementById('userDropdown');
        
        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', () => {
                userDropdown.classList.toggle('show');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                    userDropdown.classList.remove('show');
                }
            });
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
        
        // Tab navigation
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;
                
                // Update active states
                tabButtons.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                btn.classList.add('active');
                const targetContent = document.getElementById(targetTab);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }
    
    logout() {
        localStorage.removeItem('authToken');
        window.location.href = '/auth/login.html';
    }
    
    startAutoRefresh() {
        // Refresh stats every 30 seconds
        setInterval(() => {
            this.loadUserProfile();
        }, 30000);
    }
    
    // Utility functions
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
    
    formatChartDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }
    
    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        
        return this.formatDate(dateString);
    }
    
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});