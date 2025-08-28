// Supabase Configuration
// This file uses environment variables in production (Vercel)
// For local development, you can hardcode values here or use .env.local

// Load configuration from env-config.js (which contains the actual keys)
// This approach works better with Vercel's static file serving
const SUPABASE_CONFIG = {
    url: (typeof window !== 'undefined' && window.__ENV__?.SUPABASE_URL) || 'https://oofecaxnadoyqwxmyqtq.supabase.co',
    anonKey: (typeof window !== 'undefined' && window.__ENV__?.SUPABASE_ANON_KEY) || 'your-anon-key-here'
};

// Store in localStorage for auth pages
if (typeof window !== 'undefined') {
    localStorage.setItem('SUPABASE_URL', SUPABASE_CONFIG.url);
    localStorage.setItem('SUPABASE_ANON_KEY', SUPABASE_CONFIG.anonKey);
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SUPABASE_CONFIG;
}