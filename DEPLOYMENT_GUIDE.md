# Triniva AI - Deployment Guide

## Important: Supabase Configuration

### 1. Update Redirect URLs in Supabase Dashboard

Go to your Supabase project dashboard:
1. Navigate to **Authentication** → **URL Configuration**
2. Add the following URLs to **Redirect URLs**:
   - `https://triniva.com/auth/callback.html` (for production)
   - `http://localhost:3000/auth/callback.html` (for local development)
   - `https://your-vercel-app.vercel.app/auth/callback.html` (if using Vercel preview)

### 2. Update Site URL
In the same section, set:
- **Site URL**: `https://triniva.com`

### 3. Google OAuth Configuration
1. Go to **Authentication** → **Providers** → **Google**
2. Ensure Google is enabled
3. Add your Google OAuth credentials if not already configured
4. In Google Cloud Console, add these redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback`
   - The Supabase dashboard will show you the exact URL to add

## Environment Variables

### For Vercel Deployment

Add these environment variables in your Vercel project settings:

```env
# OpenRouter API
OPENROUTER_API_KEY=your_openrouter_api_key

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://oofecaxnadoyqwxmyqtq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_URL=https://oofecaxnadoyqwxmyqtq.supabase.co
SUPABASE_SECRET_KEY=your_supabase_service_role_key

# Database
DATABASE_URL=your_postgresql_connection_string

# Server Configuration
NODE_ENV=production
PORT=3000

# JWT Secret
JWT_SECRET=your_random_jwt_secret_here

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://triniva.com
```

### For Local Development

Create a `.env` file in your project root:

```env
# Copy the same variables as above but with development values
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Fixing Authentication Redirect Issues

The authentication files have been updated to automatically detect the environment and use the correct redirect URL:

- **Production**: Redirects to `https://triniva.com/auth/callback.html`
- **Local Development**: Redirects to `http://localhost:3000/auth/callback.html`

## Database Setup

1. The database schema is already created using Supabase
2. Tables include:
   - `profiles` - User profiles with credit balance
   - `conversations` - Chat sessions
   - `messages` - Chat messages
   - `subscriptions` - User subscription plans
   - `token_transactions` - Credit usage tracking

## Payment Integration (Razorpay)

When ready to implement:

1. Add Razorpay environment variables:
```env
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

2. Update webhook endpoint in Razorpay dashboard to:
   - `https://triniva.com/api/webhooks/razorpay`

## Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Update authentication redirect URLs"
git push origin main
```

### 2. Vercel will automatically deploy

### 3. Verify deployment
- Check `https://triniva.com`
- Test login with Google
- Verify redirect works correctly

## Troubleshooting

### Issue: Redirect to localhost after login
**Solution**: 
1. Clear browser cache and cookies
2. Ensure Supabase redirect URLs are configured correctly
3. Check that the production URL is properly set in Supabase dashboard

### Issue: Authentication fails
**Solution**:
1. Verify all environment variables are set in Vercel
2. Check Supabase service role key is correct
3. Ensure database URL is accessible

### Issue: Google OAuth not working
**Solution**:
1. Verify Google OAuth is enabled in Supabase
2. Check Google Cloud Console has correct redirect URIs
3. Ensure client ID and secret are configured in Supabase

## Support

For issues, check:
1. Vercel deployment logs
2. Supabase authentication logs
3. Browser console for client-side errors
4. Server logs for API errors