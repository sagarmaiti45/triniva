// This file should be generated at build time with environment variables
// For local development, create a .env.local file with these values
// DO NOT commit actual keys to version control

window.__ENV__ = {
    SUPABASE_URL: window.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL',
    SUPABASE_ANON_KEY: window.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY'
};