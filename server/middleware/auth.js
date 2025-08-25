import jwt from 'jsonwebtoken';
import { supabase, sql } from '../config/database.js';

// Middleware to verify JWT token (allows guest users)
export const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            // No token = guest user
            req.isGuest = true;
            req.userId = null;
            return next();
        }

        // Verify with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            // Invalid token = treat as guest
            req.isGuest = true;
            req.userId = null;
            return next();
        }

        req.userId = user.id;
        req.isGuest = false;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        // On error, treat as guest
        req.isGuest = true;
        req.userId = null;
        next();
    }
};

// Middleware to check if user is guest (optional auth)
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user) {
                req.userId = user.id;
                req.isGuest = false;
            } else {
                req.isGuest = true;
            }
        } else {
            req.isGuest = true;
        }
        
        next();
    } catch (error) {
        // Continue as guest
        req.isGuest = true;
        next();
    }
};

// Middleware to check token balance
export const checkTokenBalance = async (req, res, next) => {
    try {
        if (req.isGuest) {
            // Guest users can only use free models
            const model = req.body.model;
            if (model && !model.includes(':free')) {
                return res.status(403).json({ 
                    error: 'Paid models require authentication',
                    message: 'Please sign up or login to use this model'
                });
            }
            return next();
        }

        // Check user's token balance from PostgreSQL
        const profile = await sql`
            SELECT token_balance, subscription_tier 
            FROM user_profiles
            WHERE user_id = ${req.userId}
            LIMIT 1
        `;

        if (profile.length === 0) {
            // Create profile if it doesn't exist
            await sql`
                INSERT INTO user_profiles (user_id, token_balance, subscription_tier)
                VALUES (${req.userId}, 50000, 'free')
            `;
            req.tokenBalance = 50000;
            return next();
        }

        if (profile[0].token_balance <= 0) {
            return res.status(402).json({ 
                error: 'Insufficient tokens', 
                tokenBalance: 0,
                message: 'Please purchase more tokens to continue'
            });
        }

        req.tokenBalance = profile[0].token_balance;
        req.subscriptionTier = profile[0].subscription_tier;
        next();
    } catch (error) {
        console.error('Token check error:', error);
        return res.status(500).json({ error: 'Failed to verify token balance' });
    }
};

// Default export for backward compatibility
export default {
    verifyToken,
    optionalAuth,
    checkTokenBalance
};