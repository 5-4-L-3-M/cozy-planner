import { createClient } from '@supabase/supabase-js';

// Your own Supabase project: set these in a .env file (see .env.example).
export const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!SB_URL || !SB_KEY) console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env and fill them in.');

export const sb = createClient(SB_URL, SB_KEY);
