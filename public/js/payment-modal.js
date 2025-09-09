// Payment Modal Module
export class PaymentModal {
    constructor(supabase) {
        this.supabase = supabase;
        this.currentPlan = null;
        this.session = null;
        this.modalElement = null;
        this.init();
    }

    init() {
        // Create modal HTML structure
        this.createModalHTML();
        this.attachEventListeners();
    }

    createModalHTML() {
        const modalHTML = `
            <div id="paymentModal" class="payment-modal-overlay">
                <div class="payment-modal">
                    <button class="payment-modal-close" onclick="paymentModal.close()">
                        <i class="fas fa-times"></i>
                    </button>
                    
                    <div class="payment-modal-header">
                        <h2 class="payment-modal-title">Complete Your Subscription</h2>
                        <p class="payment-modal-subtitle">Secure payment powered by Razorpay</p>
                    </div>
                    
                    <div class="payment-modal-body">
                        <!-- Plan Summary -->
                        <div class="plan-summary" id="planSummary">
                            <!-- Dynamically populated -->
                        </div>
                        
                        <!-- Auth Section (for non-logged in users) -->
                        <div class="auth-section" id="authSection" style="display: none;">
                            <div class="auth-message">
                                <p>Sign in to complete your subscription</p>
                            </div>
                            <div class="auth-buttons">
                                <button class="auth-button google" onclick="paymentModal.signInWithGoogle()">
                                    <i class="fab fa-google"></i>
                                    Continue with Google
                                </button>
                                <a href="/auth/signup.html" class="auth-button email">
                                    <i class="fas fa-envelope"></i>
                                    Sign up with Email
                                </a>
                            </div>
                        </div>
                        
                        <!-- Payment Section (for logged in users) -->
                        <div class="payment-section" id="paymentSection" style="display: none;">
                            <button class="proceed-button" id="proceedButton" onclick="paymentModal.proceedToPayment()">
                                <i class="fas fa-credit-card"></i>
                                Proceed to Payment
                            </button>
                        </div>
                        
                        <!-- Loading State -->
                        <div class="payment-loading" id="paymentLoading">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Processing...</p>
                        </div>
                        
                        <!-- Success State -->
                        <div class="payment-success" id="paymentSuccess">
                            <i class="fas fa-check-circle"></i>
                            <h3>Payment Successful!</h3>
                            <p>Your subscription is now active</p>
                            <a href="/dashboard" class="success-button">Go to Dashboard</a>
                        </div>
                        
                        <!-- Already Subscribed State -->
                        <div class="already-subscribed" id="alreadySubscribed" style="display: none;">
                            <i class="fas fa-info-circle"></i>
                            <h3>You're Already Subscribed!</h3>
                            <p id="alreadySubscribedMessage">You already have an active subscription</p>
                            <div class="already-subscribed-buttons">
                                <a href="/dashboard/billing.html" class="success-button">View Billing</a>
                                <button class="secondary-button" onclick="paymentModal.close()">Close</button>
                            </div>
                        </div>
                        
                        <div class="secure-badge">
                            <i class="fas fa-lock"></i>
                            <span>Secure payment with 256-bit encryption</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modalElement = document.getElementById('paymentModal');
    }

    attachEventListeners() {
        // Close modal on overlay click
        this.modalElement.addEventListener('click', (e) => {
            if (e.target === this.modalElement) {
                this.close();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalElement.classList.contains('show')) {
                this.close();
            }
        });
    }

    async open(planId) {
        // Prevent body scroll on mobile
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        
        // Plan configurations
        const plans = {
            starter: {
                name: 'Starter',
                amount: 29700,
                credits: 15000,
                price: '₹297',
                features: [
                    '15,000 credits per month',
                    '12 AI models (no premium)',
                    '30 days chat history',
                    'Image upload support',
                    'Email support'
                ]
            },
            pro: {
                name: 'Pro',
                amount: 69700,
                credits: 50000,
                price: '₹697',
                features: [
                    '50,000 credits per month',
                    'ALL 16 AI models',
                    '30 days chat history',
                    'Image upload support',
                    'Priority email support'
                ]
            },
            business: {
                name: 'Business',
                amount: 149700,
                credits: 150000,
                price: '₹1497',
                features: [
                    '150,000 credits per month',
                    'ALL 16 AI models',
                    '30 days chat history',
                    'Image upload support',
                    '24/7 priority support'
                ]
            }
        };

        this.currentPlan = { id: planId, ...plans[planId] };
        if (!this.currentPlan.name) return;

        // Check authentication
        const { data: { session } } = await this.supabase.auth.getSession();
        this.session = session;

        // Check if user already has this plan
        if (session) {
            try {
                const { data: userData } = await this.supabase
                    .from('users')
                    .select('plan')
                    .eq('id', session.user.id)
                    .single();

                if (userData && userData.plan === planId) {
                    // User already has this plan - show message instead
                    this.showAlreadySubscribedMessage(planId);
                    return;
                }
            } catch (error) {
                console.error('Error checking user plan:', error);
            }
        }

        // Update plan summary
        this.updatePlanSummary();

        // Show appropriate section
        const authSection = document.getElementById('authSection');
        const paymentSection = document.getElementById('paymentSection');
        const loadingSection = document.getElementById('paymentLoading');
        const successSection = document.getElementById('paymentSuccess');

        // Reset states
        authSection.style.display = 'none';
        paymentSection.style.display = 'none';
        loadingSection.classList.remove('show');
        successSection.classList.remove('show');

        if (!session) {
            // Show auth section
            authSection.style.display = 'block';
            
            // Store plan for after auth
            sessionStorage.setItem('selectedPlan', planId);
            sessionStorage.setItem('redirectAfterAuth', 'checkout');
        } else {
            // Show payment section
            paymentSection.style.display = 'block';
        }

        // Show modal
        this.modalElement.classList.add('show');
    }

    updatePlanSummary() {
        const summaryHTML = `
            <div class="plan-summary-header">
                <div class="plan-summary-name">${this.currentPlan.name} Plan</div>
                <div class="plan-summary-price">
                    <span class="currency">₹</span>
                    <span class="amount">${this.currentPlan.price.replace('₹', '')}</span>
                    <span class="period">/month</span>
                </div>
            </div>
            <div class="plan-features-summary">
                ${this.currentPlan.features.map(feature => `
                    <div class="plan-feature-item">
                        <i class="fas fa-check"></i>
                        <span>${feature}</span>
                    </div>
                `).join('')}
            </div>
        `;
        
        document.getElementById('planSummary').innerHTML = summaryHTML;
    }

    async signInWithGoogle() {
        try {
            // Show loading
            document.getElementById('paymentLoading').classList.add('show');
            document.getElementById('authSection').style.display = 'none';

            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback.html?plan=${this.currentPlan.id}`
                }
            });

            if (error) throw error;
        } catch (error) {
            console.error('Auth error:', error);
            alert('Authentication failed. Please try again.');
            document.getElementById('paymentLoading').classList.remove('show');
            document.getElementById('authSection').style.display = 'block';
        }
    }

    async proceedToPayment() {
        if (!this.session || !this.currentPlan) return;

        const proceedButton = document.getElementById('proceedButton');
        proceedButton.disabled = true;
        proceedButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        try {
            // Initialize Razorpay
            const options = {
                key: 'rzp_test_RAMe23vc9cnhWu',
                amount: this.currentPlan.amount,
                currency: 'INR',
                name: 'Triniva AI',
                description: `${this.currentPlan.name} Plan - ${this.currentPlan.credits.toLocaleString()} credits/month`,
                prefill: {
                    email: this.session.user.email,
                    name: this.session.user.user_metadata?.full_name || ''
                },
                theme: {
                    color: '#10a37f'
                },
                modal: {
                    ondismiss: () => {
                        proceedButton.disabled = false;
                        proceedButton.innerHTML = '<i class="fas fa-credit-card"></i> Proceed to Payment';
                    }
                },
                handler: async (response) => {
                    // Payment successful
                    await this.handlePaymentSuccess(response);
                }
            };

            const rzp = new Razorpay(options);
            rzp.open();

        } catch (error) {
            console.error('Payment error:', error);
            alert('Something went wrong. Please try again.');
            proceedButton.disabled = false;
            proceedButton.innerHTML = '<i class="fas fa-credit-card"></i> Proceed to Payment';
        }
    }

    async handlePaymentSuccess(response) {
        // Hide payment section, show success
        document.getElementById('paymentSection').style.display = 'none';
        document.getElementById('paymentLoading').classList.add('show');

        try {
            // Update user in database (in production, this should be done via secure backend)
            const { error } = await this.supabase
                .from('users')
                .update({
                    plan: this.currentPlan.id,
                    credits: this.currentPlan.credits,
                    plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                })
                .eq('id', this.session.user.id);

            if (error) throw error;

            // Create subscription record
            await this.supabase
                .from('subscriptions')
                .insert({
                    user_id: this.session.user.id,
                    plan_id: this.currentPlan.id,
                    amount_paid: this.currentPlan.amount / 100,
                    credits_granted: this.currentPlan.credits,
                    razorpay_payment_id: response.razorpay_payment_id,
                    status: 'active',
                    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                });

            // Show success
            document.getElementById('paymentLoading').classList.remove('show');
            document.getElementById('paymentSuccess').classList.add('show');

            // Clear session storage
            sessionStorage.removeItem('selectedPlan');
            sessionStorage.removeItem('redirectAfterAuth');

        } catch (error) {
            console.error('Database error:', error);
            alert('Payment was successful but there was an error updating your account. Please contact support.');
        }
    }

    showAlreadySubscribedMessage(planId) {
        const planNames = {
            'starter': 'Starter',
            'pro': 'Pro',
            'business': 'Business'
        };
        
        const planName = planNames[planId] || planId;
        
        // Hide all other sections
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('paymentSection').style.display = 'none';
        document.getElementById('paymentLoading').classList.remove('show');
        document.getElementById('paymentSuccess').classList.remove('show');
        document.getElementById('planSummary').style.display = 'none';
        
        // Update message and show already subscribed section
        document.getElementById('alreadySubscribedMessage').innerHTML = 
            `You're already on the <strong>${planName} Plan</strong>. Visit your billing page to manage your subscription or upgrade to a higher plan.`;
        document.getElementById('alreadySubscribed').style.display = 'block';
        
        // Update modal header
        document.querySelector('.payment-modal-title').textContent = 'Already Subscribed';
        document.querySelector('.payment-modal-subtitle').textContent = `You have an active ${planName} subscription`;
        
        // Show modal
        this.modalElement.classList.add('show');
    }

    close() {
        this.modalElement.classList.remove('show');
        this.currentPlan = null;
        
        // Restore body scroll
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        this.session = null;
        
        // Reset states
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('paymentSection').style.display = 'none';
        document.getElementById('paymentLoading').classList.remove('show');
        document.getElementById('paymentSuccess').classList.remove('show');
        document.getElementById('alreadySubscribed').style.display = 'none';
        document.getElementById('planSummary').style.display = 'block';
        
        // Reset header text
        document.querySelector('.payment-modal-title').textContent = 'Complete Your Subscription';
        document.querySelector('.payment-modal-subtitle').textContent = 'Secure payment powered by Razorpay';
    }
}

// Auto-initialize when imported
if (typeof window !== 'undefined') {
    window.PaymentModal = PaymentModal;
}