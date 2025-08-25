# OAuth Setup Instructions for Triniva AI

## Important: OAuth Configuration Required

For Google OAuth to work properly, you need to:

### 1. Update Supabase Configuration in Auth Pages

Replace the placeholder values in the following files with your actual Supabase credentials:
- `/public/auth/login.html`
- `/public/auth/signup.html`
- `/public/auth/callback.html`

Look for these lines and replace with your actual values:
```javascript
const SUPABASE_URL = 'https://your-project.supabase.co'; // Replace with your Supabase URL
const SUPABASE_ANON_KEY = 'your-anon-key'; // Replace with your anon key
```

You can find these values in your Supabase project:
1. Go to your Supabase Dashboard
2. Navigate to Settings > API
3. Copy the "Project URL" and "anon public" key

### 2. Configure Google OAuth in Supabase

1. **In Supabase Dashboard:**
   - Go to Authentication > Providers
   - Click on Google
   - Enable the Google provider
   - Add your Google OAuth credentials (Client ID and Client Secret)

2. **Set the correct redirect URLs:**
   - For local development: `http://localhost:3000/auth/callback.html`
   - For production: `https://yourdomain.com/auth/callback.html`

3. **In Google Cloud Console:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Select your project or create a new one
   - Navigate to APIs & Services > Credentials
   - Create OAuth 2.0 Client ID (if not already created)
   - Add authorized redirect URIs:
     - `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
     - Your Supabase project's callback URL (found in Supabase Auth settings)

### 3. Configure Redirect URLs

In Supabase Dashboard:
1. Go to Authentication > URL Configuration
2. Add site URL: `http://localhost:3000` (for development)
3. Add redirect URLs:
   - `http://localhost:3000/auth/callback.html`
   - `http://localhost:3000/`

### 4. Testing OAuth

1. Start your server: `npm run dev`
2. Navigate to `http://localhost:3000/auth/login.html`
3. Click "Continue with Google"
4. You should be redirected to Google's login page
5. After authentication, you'll be redirected back to `/auth/callback.html`
6. The callback page will process the authentication and redirect to the main app

### 5. Troubleshooting

**If OAuth is not working:**

1. **Check Browser Console:**
   - Open Developer Tools (F12)
   - Check for any error messages in the Console tab
   - Common errors include CORS issues or missing configuration

2. **Verify Supabase Configuration:**
   - Ensure Google provider is enabled in Supabase
   - Check that redirect URLs match exactly (including trailing slashes)
   - Verify Client ID and Secret are correct

3. **Check Network Tab:**
   - Monitor the Network tab during OAuth flow
   - Look for failed requests to Supabase or Google

4. **Common Issues:**
   - **"Invalid redirect_uri"**: Make sure the redirect URL in your code matches what's configured in both Google Cloud Console and Supabase
   - **"Access blocked"**: Ensure your app is not in testing mode in Google Cloud Console, or add test users
   - **CORS errors**: Make sure your site URL is properly configured in Supabase

### 6. Production Deployment

Before deploying to production:
1. Update all redirect URLs to use your production domain
2. Update the Supabase configuration in all auth pages
3. Add production redirect URLs to both Google Cloud Console and Supabase
4. Ensure HTTPS is enabled (OAuth requires secure connections in production)
5. Test the entire flow in production environment

### 7. Security Notes

- Never commit your Supabase secret key (service key) to version control
- The anon key is safe to use in frontend code (it's meant to be public)
- Always use environment variables for sensitive configuration in production
- Enable Row Level Security (RLS) on all your Supabase tables

## Need Help?

If you're still having issues:
1. Check the [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
2. Review the [Google OAuth Setup Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
3. Check your browser's console for specific error messages