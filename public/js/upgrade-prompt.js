// Upgrade Prompt Module
export class UpgradePrompt {
    constructor() {
        this.promptElement = null;
        this.init();
    }

    init() {
        // Create upgrade prompt HTML
        const promptHTML = `
            <div id="upgradePrompt" class="upgrade-prompt-overlay" style="display: none;">
                <div class="upgrade-prompt">
                    <div class="upgrade-prompt-header">
                        <i class="fas fa-exclamation-triangle upgrade-icon"></i>
                        <h3>Credit Limit Reached</h3>
                    </div>
                    
                    <div class="upgrade-prompt-body">
                        <p class="upgrade-message">
                            You've used all your available credits for this month. 
                            Upgrade your plan to continue using AI models.
                        </p>
                        
                        <div class="upgrade-options">
                            <div class="upgrade-option starter">
                                <div class="option-header">
                                    <span class="option-name">Starter</span>
                                    <span class="option-price">₹297/mo</span>
                                </div>
                                <div class="option-credits">15,000 credits</div>
                                <button class="option-button" onclick="upgradePrompt.selectPlan('starter')">
                                    Choose Starter
                                </button>
                            </div>
                            
                            <div class="upgrade-option pro recommended">
                                <div class="recommended-badge">RECOMMENDED</div>
                                <div class="option-header">
                                    <span class="option-name">Pro</span>
                                    <span class="option-price">₹697/mo</span>
                                </div>
                                <div class="option-credits">50,000 credits</div>
                                <button class="option-button primary" onclick="upgradePrompt.selectPlan('pro')">
                                    Choose Pro
                                </button>
                            </div>
                            
                            <div class="upgrade-option business">
                                <div class="option-header">
                                    <span class="option-name">Business</span>
                                    <span class="option-price">₹1,497/mo</span>
                                </div>
                                <div class="option-credits">150,000 credits</div>
                                <button class="option-button" onclick="upgradePrompt.selectPlan('business')">
                                    Choose Business
                                </button>
                            </div>
                        </div>
                        
                        <div class="upgrade-footer">
                            <button class="cancel-button" onclick="upgradePrompt.close()">
                                Maybe Later
                            </button>
                            <a href="/plans" class="view-all-link">
                                View all plans →
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        const styles = `
            <style>
                .upgrade-prompt-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(5px);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: fadeIn 0.2s ease;
                }

                .upgrade-prompt {
                    background: var(--bg-primary);
                    border-radius: 20px;
                    max-width: 600px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                    animation: slideUp 0.3s ease;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                }

                .upgrade-prompt-header {
                    text-align: center;
                    padding: 30px 30px 20px;
                    border-bottom: 1px solid var(--border-color);
                }

                .upgrade-icon {
                    font-size: 48px;
                    color: #ff9800;
                    margin-bottom: 16px;
                }

                .upgrade-prompt-header h3 {
                    margin: 0;
                    font-size: 24px;
                    color: var(--text-primary);
                }

                .upgrade-prompt-body {
                    padding: 30px;
                }

                .upgrade-message {
                    text-align: center;
                    color: var(--text-secondary);
                    margin-bottom: 30px;
                    font-size: 15px;
                }

                .upgrade-options {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 20px;
                    margin-bottom: 30px;
                }

                .upgrade-option {
                    background: var(--bg-secondary);
                    border: 2px solid var(--border-color);
                    border-radius: 12px;
                    padding: 20px;
                    text-align: center;
                    position: relative;
                    transition: all 0.2s;
                }

                .upgrade-option.recommended {
                    border-color: var(--accent-color);
                    background: rgba(16, 163, 127, 0.05);
                }

                .recommended-badge {
                    position: absolute;
                    top: -10px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--accent-color);
                    color: white;
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 10px;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .option-header {
                    margin-bottom: 8px;
                }

                .option-name {
                    display: block;
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: 4px;
                }

                .option-price {
                    font-size: 20px;
                    font-weight: 700;
                    color: var(--accent-color);
                }

                .option-credits {
                    color: var(--text-secondary);
                    font-size: 14px;
                    margin-bottom: 16px;
                }

                .option-button {
                    width: 100%;
                    padding: 10px 16px;
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                    background: var(--bg-primary);
                    color: var(--text-primary);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .option-button.primary {
                    background: var(--accent-color);
                    color: white;
                    border: none;
                }

                .option-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }

                .option-button.primary:hover {
                    background: #0e9571;
                }

                .upgrade-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: 20px;
                    border-top: 1px solid var(--border-color);
                }

                .cancel-button {
                    padding: 10px 20px;
                    background: transparent;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .cancel-button:hover {
                    border-color: var(--text-secondary);
                    color: var(--text-primary);
                }

                .view-all-link {
                    color: var(--accent-color);
                    text-decoration: none;
                    font-weight: 500;
                }

                .view-all-link:hover {
                    text-decoration: underline;
                }

                /* Mobile responsiveness */
                @media (max-width: 640px) {
                    .upgrade-options {
                        grid-template-columns: 1fr;
                    }
                    
                    .upgrade-prompt {
                        width: 100%;
                        height: 100%;
                        max-height: 100%;
                        border-radius: 0;
                    }
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideUp {
                    from {
                        transform: translateY(20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            </style>
        `;

        // Add to document
        document.head.insertAdjacentHTML('beforeend', styles);
        document.body.insertAdjacentHTML('beforeend', promptHTML);
        
        this.promptElement = document.getElementById('upgradePrompt');
    }

    show(message = null) {
        if (message) {
            document.querySelector('.upgrade-message').textContent = message;
        }
        this.promptElement.style.display = 'flex';
    }

    close() {
        this.promptElement.style.display = 'none';
    }

    async selectPlan(planId) {
        // Check if payment modal is available
        if (window.paymentModal) {
            this.close();
            window.paymentModal.open(planId);
        } else {
            // Fallback to plans page
            window.location.href = `/plans?plan=${planId}`;
        }
    }
}

// Auto-initialize
if (typeof window !== 'undefined') {
    window.upgradePrompt = new UpgradePrompt();
}