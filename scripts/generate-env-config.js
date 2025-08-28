#!/usr/bin/env node

/**
 * This script generates the env-config.js file with public environment variables
 * Run this during build time to inject the actual values
 */

const fs = require('fs');
const path = require('path');

// Get environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing required environment variables');
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
}

const envConfig = `// Auto-generated file - DO NOT EDIT
// Generated at build time from environment variables

window.__ENV__ = {
    SUPABASE_URL: '${SUPABASE_URL}',
    SUPABASE_ANON_KEY: '${SUPABASE_ANON_KEY}'
};
`;

// Write to public/js/env-config.js
const outputPath = path.join(__dirname, '..', 'public', 'js', 'env-config.js');
fs.writeFileSync(outputPath, envConfig);

console.log('✅ Generated env-config.js with environment variables');