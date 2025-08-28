# Triniva AI Platform - Database Setup Instructions

## 🚀 Step 1: Run Database Schema in Supabase

### Prerequisites
- Active Supabase project
- Access to Supabase dashboard

### Instructions:

1. **Open Supabase SQL Editor:**
   - Go to your [Supabase Dashboard](https://app.supabase.com)
   - Select your project (oofecaxnadoyqwxmyqtq)
   - Navigate to **SQL Editor** in the left sidebar

2. **Run the Schema:**
   - Copy ALL content from `database/schema.sql`
   - Paste into the SQL Editor
   - Click **Run** button
   - You should see: "Database schema created successfully!"

3. **Verify Tables Created:**
   Go to **Table Editor** and confirm these tables exist:
   - ✅ `users` - Stores user profiles and credits
   - ✅ `orders` - Razorpay payment orders
   - ✅ `subscriptions` - Subscription history
   - ✅ `usage_logs` - Credit usage tracking
   - ✅ `chat_history` - Saved conversations

4. **Verify RLS is Enabled:**
   - Click each table
   - Go to **RLS** tab
   - Ensure "RLS enabled" toggle is ON
   - Policies should be listed

## 📊 Step 2: Understanding the Credit System

### How Credits Work:

| Plan | Monthly Credits | Price | Model Access |
|------|----------------|-------|--------------|
| **Free** | 5,000 | Free | 12 models (no premium) |
| **Starter** | 15,000 | ₹297 | 12 models (no premium) |
| **Pro** | 50,000 | ₹697 | All 16 models |
| **Business** | 150,000 | ₹1,497 | All 16 models |

### Credit Consumption by Model Type:

| Model Category | Multiplier | Example Models | 1000 tokens cost |
|----------------|------------|----------------|------------------|
| **Free** | 1x | Gemini Flash, Llama 3.1 | 1 credit |
| **Budget** | 2-4x | GPT-4o mini, Claude Haiku | 2-4 credits |
| **Mid-tier** | 8x | GPT-4o, Gemini Pro | 8 credits |
| **Premium** | 20x | Claude Sonnet, GPT-5 | 20 credits |

## 🔧 Step 3: Test the System

### A. Test New User Creation:
1. Sign up at `/auth/signup.html`
2. Check in Supabase:
```sql
SELECT * FROM users ORDER BY created_at DESC LIMIT 1;
```
3. New user should have:
   - plan: 'free'
   - credits: 5000

### B. Test Credit Deduction (Manual):
```sql
-- Test deducting 100 credits from a user
SELECT deduct_credits('USER_ID_HERE', 100);
```

### C. Test Adding Credits (Manual):
```sql
-- Test adding 1000 credits to a user
SELECT add_credits('USER_ID_HERE', 1000, 'pro');
```

## 💳 Step 4: Payment Flow

### When User Purchases a Plan:

1. **Order Creation:**
   - User selects plan
   - System creates order in `orders` table
   - Razorpay checkout opens

2. **Payment Verification:**
   - Razorpay sends payment confirmation
   - System verifies signature
   - Updates order status to 'completed'

3. **Credit Addition:**
   - Credits added to user account
   - Plan updated
   - Subscription record created

## 🔍 Step 5: Monitoring Queries

### Check User Stats:
```sql
-- View user statistics
SELECT * FROM user_stats;
```

### Check Recent Usage:
```sql
-- Last 10 credit usages
SELECT 
    u.email,
    ul.model_id,
    ul.credits_used,
    ul.created_at
FROM usage_logs ul
JOIN users u ON u.id = ul.user_id
ORDER BY ul.created_at DESC
LIMIT 10;
```

### Check Active Subscriptions:
```sql
-- Active subscriptions
SELECT 
    u.email,
    s.plan_id,
    s.credits_granted,
    s.expires_at
FROM subscriptions s
JOIN users u ON u.id = s.user_id
WHERE s.status = 'active'
ORDER BY s.created_at DESC;
```

### Daily Credit Usage:
```sql
-- Credits used today
SELECT 
    SUM(credits_used) as total_credits_today,
    COUNT(*) as total_requests
FROM usage_logs
WHERE created_at >= CURRENT_DATE;
```

## ⚠️ Important Notes

1. **Automatic User Creation:**
   - New signups automatically get user record via trigger
   - 5000 free credits granted on signup

2. **Credit Safety:**
   - Credits cannot go negative
   - Deduction fails if insufficient credits
   - User sees error message

3. **Plan Expiration:**
   - Plans last 30 days from purchase
   - After expiry, user reverts to free plan
   - Credits remain but no new monthly credits

## 🐛 Troubleshooting

### Issue: User not created on signup
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Manually create user if needed
INSERT INTO users (id, email, full_name, credits, plan)
SELECT id, email, raw_user_meta_data->>'full_name', 5000, 'free'
FROM auth.users
WHERE id NOT IN (SELECT id FROM users);
```

### Issue: Credits not deducting
```sql
-- Check user credits
SELECT id, email, credits, plan FROM users WHERE email = 'user@example.com';

-- Check if RLS is blocking
SET ROLE postgres;  -- Use superuser role
SELECT * FROM users;  -- Should see all users
SET ROLE anon;  -- Switch back
```

### Issue: Statistics not showing
```sql
-- Recreate the view
DROP VIEW IF EXISTS user_stats;
-- Then run the CREATE VIEW statement from schema.sql
```

## ✅ Next Steps

After database setup:

1. **Configure Backend:**
   - Set up Node.js server endpoints
   - Connect to Supabase from backend
   - Implement credit deduction on API calls

2. **Update Frontend:**
   - Show real credit balance in dashboard
   - Display usage statistics
   - Enable payment flow

3. **Testing:**
   - Test complete signup → chat → payment flow
   - Monitor credit deductions
   - Verify plan restrictions

## 📞 Support

Check these locations for errors:
1. Browser Console (F12 → Console)
2. Supabase Dashboard → Logs → Database
3. Network tab for API errors

---

**Remember:** This schema includes automatic triggers and functions. Most operations happen automatically!