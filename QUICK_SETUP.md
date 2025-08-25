# 🚀 Quick Setup Guide - Triniva AI

## Step 1: Configure Supabase Credentials

### Edit the config file: `/public/js/config.js`

```javascript
const SUPABASE_CONFIG = {
    url: 'https://YOUR-PROJECT-ID.supabase.co',  // ← Replace this
    anonKey: 'YOUR-ANON-KEY-HERE'                 // ← Replace this
};
```

### Where to find these values:
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (looks like: `https://abcdefghijk.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

## Step 2: Configure Google OAuth in Supabase

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Click on **Google**
3. Toggle **Enable Google** to ON
4. Add your Google OAuth credentials:
   - **Client ID** (from Google Cloud Console)
   - **Client Secret** (from Google Cloud Console)
5. **Authorized Client IDs**: Add your Client ID here too

## Step 3: Set Redirect URLs in Supabase

Go to **Authentication** → **URL Configuration** and set:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: Add these URLs
  ```
  http://localhost:3000/auth/callback.html
  http://localhost:3000
  ```

## Step 4: Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select your project
3. Go to **APIs & Services** → **Credentials**
4. Create **OAuth 2.0 Client ID** (Web application)
5. Add **Authorized redirect URIs**:
   ```
   https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback
   ```
   (Replace YOUR-PROJECT-ID with your actual Supabase project ID)

## Step 5: Test Your Setup

1. Start your server:
   ```bash
   npm run dev
   ```

2. Open: `http://localhost:3000/auth/test-supabase.html`
   - This test page will help verify your configuration

3. Try logging in at: `http://localhost:3000/auth/login.html`

## Testing on localhost:3000

**YES, it will work!** When testing from `localhost:3000`:
- The OAuth redirect will go to Google
- Google will redirect back to Supabase
- Supabase will redirect to your callback URL (`http://localhost:3000/auth/callback.html`)
- The callback page will complete the authentication

## Common Issues & Solutions

### "Invalid redirect_uri" Error
- Make sure `http://localhost:3000/auth/callback.html` is in Supabase redirect URLs
- Ensure your Google Cloud Console has the Supabase callback URL

### "your-project.supabase.co" Error
- You haven't updated `/public/js/config.js` with your actual credentials
- Check that the file saved correctly

### OAuth Not Working
- Verify Google provider is enabled in Supabase
- Check that Client ID and Secret are correct
- Make sure you're accessing the site via `http://localhost:3000` (not file://)

### OTP Not Sending
- Check Supabase email settings (Authentication → Email Templates)
- Verify your project is not in test mode with email restrictions

## Next Steps

Once working locally, for production:
1. Update redirect URLs to your production domain
2. Add production domain to Google Cloud Console
3. Update `/public/js/config.js` (or use environment variables)
4. Enable HTTPS (required for production OAuth)

---

**Need help?** Check the browser console (F12) for detailed error messages.