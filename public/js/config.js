// Supabase Configuration
// This file uses environment variables in production (Vercel)
// For local development, you can hardcode values here or use .env.local

const SUPABASE_CONFIG = {
    // Check for environment variables first (Vercel), then use hardcoded values (local dev)
    url: typeof window !== 'undefined' && window.ENV?.SUPABASE_URL 
        ? window.ENV.SUPABASE_URL 
        : 'https://oofecaxnadoyqwxmyqtq.supabase.co',
    
    anonKey: typeof window !== 'undefined' && window.ENV?.SUPABASE_ANON_KEY 
        ? window.ENV.SUPABASE_ANON_KEY 
        : 'your-anon-key-here'  // ← Replace for local development
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