import express from 'express';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// Razorpay configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// Plan configurations
const PLANS = {
    starter: {
        name: 'Starter Plan',
        amount: 29700, // ₹297 in paise
        currency: 'INR',
        credits: 15000,
        features: {
            chatHistory: 30,
            models: 'limited', // No premium models
            support: 'basic'
        }
    },
    pro: {
        name: 'Pro Plan',
        amount: 69700, // ₹697 in paise
        currency: 'INR',
        credits: 50000,
        features: {
            chatHistory: 30,
            models: 'all',
            support: 'priority'
        }
    },
    business: {
        name: 'Business Plan',
        amount: 149700, // ₹1497 in paise
        currency: 'INR',
        credits: 150000,
        features: {
            chatHistory: 30,
            models: 'all',
            support: 'dedicated'
        }
    }
};

// Create order for payment
router.post('/create-order', authenticateToken, async (req, res) => {
    try {
        const { planId } = req.body;
        const userId = req.userId;
        
        if (!PLANS[planId]) {
            return res.status(400).json({ error: 'Invalid plan selected' });
        }
        
        const plan = PLANS[planId];
        
        // Create Razorpay order
        const options = {
            amount: plan.amount,
            currency: plan.currency,
            receipt: `order_${userId}_${Date.now()}`,
            notes: {
                userId,
                planId,
                planName: plan.name
            }
        };
        
        // For now, return mock order data for testing
        // In production, use Razorpay SDK
        const order = {
            id: `order_${crypto.randomBytes(16).toString('hex')}`,
            amount: options.amount,
            currency: options.currency,
            receipt: options.receipt,
            status: 'created',
            notes: options.notes
        };
        
        // Store order in database
        const { error: dbError } = await supabase
            .from('orders')
            .insert({
                order_id: order.id,
                user_id: userId,
                plan_id: planId,
                amount: plan.amount,
                status: 'created',
                created_at: new Date().toISOString()
            });
            
        if (dbError) {
            console.error('Database error:', dbError);
            return res.status(500).json({ error: 'Failed to create order' });
        }
        
        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: RAZORPAY_KEY_ID
        });
        
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Verify payment and activate subscription
router.post('/verify-payment', authenticateToken, async (req, res) => {
    try {
        const { orderId, paymentId, signature } = req.body;
        const userId = req.userId;
        
        // Verify signature
        const text = `${orderId}|${paymentId}`;
        const expectedSignature = crypto
            .createHmac('sha256', RAZORPAY_KEY_SECRET)
            .update(text)
            .digest('hex');
            
        if (expectedSignature !== signature) {
            return res.status(400).json({ error: 'Invalid payment signature' });
        }
        
        // Get order details
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('order_id', orderId)
            .eq('user_id', userId)
            .single();
            
        if (orderError || !order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        const plan = PLANS[order.plan_id];
        
        // Update order status
        await supabase
            .from('orders')
            .update({
                status: 'completed',
                payment_id: paymentId,
                completed_at: new Date().toISOString()
            })
            .eq('order_id', orderId);
        
        // Get current user data
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
            
        if (userError) {
            // Create user if doesn't exist
            await supabase
                .from('users')
                .insert({
                    id: userId,
                    plan: order.plan_id,
                    credits: plan.credits,
                    plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    created_at: new Date().toISOString()
                });
        } else {
            // Update existing user
            await supabase
                .from('users')
                .update({
                    plan: order.plan_id,
                    credits: (userData.credits || 0) + plan.credits,
                    plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);
        }
        
        // Create subscription record
        await supabase
            .from('subscriptions')
            .insert({
                user_id: userId,
                plan_id: order.plan_id,
                order_id: orderId,
                payment_id: paymentId,
                amount: order.amount,
                credits_granted: plan.credits,
                starts_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'active'
            });
        
        res.json({
            success: true,
            plan: order.plan_id,
            credits: plan.credits,
            message: 'Subscription activated successfully'
        });
        
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});

// Get user subscription status
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
            
        if (error || !user) {
            // Return free plan if user doesn't exist
            return res.json({
                plan: 'free',
                credits: 5000,
                planExpiresAt: null,
                features: {
                    chatHistory: 7,
                    models: 'limited',
                    support: 'community'
                }
            });
        }
        
        // Check if plan is expired
        const isExpired = user.plan_expires_at && new Date(user.plan_expires_at) < new Date();
        const currentPlan = isExpired ? 'free' : user.plan;
        
        res.json({
            plan: currentPlan,
            credits: user.credits || 0,
            planExpiresAt: user.plan_expires_at,
            features: PLANS[currentPlan]?.features || {
                chatHistory: 7,
                models: 'limited',
                support: 'community'
            }
        });
        
    } catch (error) {
        console.error('Subscription status error:', error);
        res.status(500).json({ error: 'Failed to get subscription status' });
    }
});

// Get subscription history
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        
        const { data: subscriptions, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
            
        if (error) {
            return res.status(500).json({ error: 'Failed to get subscription history' });
        }
        
        res.json(subscriptions || []);
        
    } catch (error) {
        console.error('Subscription history error:', error);
        res.status(500).json({ error: 'Failed to get subscription history' });
    }
});

export default router;