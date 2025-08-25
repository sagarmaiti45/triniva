import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL direct connection for server-side operations
const sql = postgres(process.env.DATABASE_URL, {
    max: 10, // Max number of connections
    idle_timeout: 20,
    connect_timeout: 10,
});

// Supabase client for authentication and real-time features
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export { sql, supabase };