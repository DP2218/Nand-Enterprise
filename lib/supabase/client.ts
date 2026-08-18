// lib/supabase/client.ts
// Browser-side Supabase client using ANON (public) key.
// This client has RLS enforced and should only be used for truly
// public data. All sensitive operations must go through Next.js
// API routes which use the server-side service role client.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_*)');
}

export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);
