# Triniva AI - Setup Instructions

## 🚀 Quick Setup Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables Setup
Create a `.env` file in the root directory and add:

```env
# OpenRouter API
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_PUBLISHABLE_KEY=sb_publishable_Q_Vnzoqn8VJgoJJzZUfvAQ_agrXyRKk
SUPABASE_SECRET_KEY=sb_secret_uqlJCGLeVzmZSedKXNSCeA_krk8HKmh
DATABASE_URL=your_postgresql_connection_string

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Secret (generate a random string)
JWT_SECRET=your_random_jwt_secret_here

# PayU Configuration (for payments - add later)
PAYU_MERCHANT_KEY=your_payu_merchant_key
PAYU_MERCHANT_SALT=your_payu_salt
PAYU_BASE_URL=https://sandboxsecure.payu.in
```

### 3. Supabase Setup

#### A. Get Your Supabase Project URL
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the "Project URL" (looks like: https://xxxxx.supabase.co)
4. Copy the "Database URL" from Settings > Database

#### B. Enable Authentication Providers
1. Go to Authentication > Providers
2. Enable Email provider with email verification
3. Enable Google OAuth:
   - Add your Google OAuth credentials
   - Set redirect URL: `http://localhost:3000/auth/callback`
4. Enable GitHub OAuth:
   - Add your GitHub OAuth credentials
   - Set redirect URL: `http://localhost:3000/auth/callback`

#### C. Configure Email Templates
1. Go to Authentication > Email Templates
2. Customize the verification email template
3. Customize the password reset template

#### D. Run Database Schema
1. Go to SQL Editor in Supabase
2. Copy the contents of `/database/schema.sql`
3. Run the SQL to create all tables and policies

### 4. Frontend Configuration
Add Supabase configuration to your frontend:

```javascript
// In your main chat.js or a separate config file
const SUPABASE_CONFIG = {
    url: 'your_supabase_project_url',
    anonKey: 'your_publishable_key'
};

// Store in localStorage for auth pages
localStorage.setItem('SUPABASE_URL', SUPABASE_CONFIG.url);
localStorage.setItem('SUPABASE_ANON_KEY', SUPABASE_CONFIG.anonKey);
```

### 5. Update Server Code
The server needs to be updated to use ES6 modules. Update `package.json`:

```json
{
  "type": "module",
  ...
}
```

Or rename files to `.mjs` extension if you prefer CommonJS for the main server.

### 6. Test the Setup

#### A. Test Database Connection
```bash
node -e "
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);
sql\`SELECT NOW()\`.then(console.log).catch(console.error);
"
```

#### B. Start the Server
```bash
npm run dev
```

#### C. Test Authentication
1. Navigate to `http://localhost:3000/auth/signup.html`
2. Create a new account
3. Check email for verification
4. Login at `http://localhost:3000/auth/login.html`

### 7. Important URLs

- **Main App**: http://localhost:3000
- **Login**: http://localhost:3000/auth/login.html
- **Signup**: http://localhost:3000/auth/signup.html
- **Dashboard**: http://localhost:3000/dashboard (to be created)
- **Billing**: http://localhost:3000/dashboard/billing.html (to be created)

## 📝 Next Steps

1. **Complete Server Integration**:
   - Update main server.js to handle authenticated requests
   - Add token counting middleware
   - Implement conversation persistence

2. **Create Dashboard Pages**:
   - User profile page
   - Usage statistics
   - Billing management

3. **Payment Integration**:
   - Set up PayU account
   - Add payment webhook endpoints
   - Create subscription management

4. **Create Additional Legal Pages**:
   - Refund Policy
   - About Us
   - Contact Us

## 🔒 Security Checklist

- [ ] Enable Row Level Security (RLS) on all tables
- [ ] Set up proper CORS configuration
- [ ] Use HTTPS in production
- [ ] Implement rate limiting
- [ ] Add input validation
- [ ] Set up proper error logging
- [ ] Configure backup strategy

## 🐛 Troubleshooting

### Common Issues

1. **"Missing Supabase environment variables"**
   - Ensure all Supabase keys are in .env file
   - Check that .env is loaded properly

2. **"Database connection failed"**
   - Verify DATABASE_URL is correct
   - Check if Supabase project is active
   - Ensure IP is whitelisted (if applicable)

3. **"Authentication not working"**
   - Verify Supabase Auth providers are enabled
   - Check redirect URLs match your domain
   - Ensure email templates are configured

4. **"Tokens not deducting"**
   - Check if user profile exists in database
   - Verify token calculation logic
   - Check model pricing configuration

## 📚 Documentation Links

- [Supabase Docs](https://supabase.com/docs)
- [OpenRouter API](https://openrouter.ai/docs)
- [PayU Integration](https://developer.payu.in/docs)

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review error logs in browser console
3. Check server logs
4. Contact support through the platform

---

**Note**: Remember to keep your API keys and secrets secure. Never commit them to version control.