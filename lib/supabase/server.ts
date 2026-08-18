// lib/supabase/server.ts
// Server-side Supabase client using SERVICE ROLE key.
// ONLY use this in Next.js API routes (app/api/**).
// NEVER import this in client components or expose to the browser.

import { createClient } from '@supabase/supabase-js';

export function createServerClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Create client on demand — avoids module-level throw during build
export function getServerClient() {
  return createServerClient();
}

// Default export for convenience in route handlers
export const supabaseServer = {
  from: (table: string) => createServerClient().from(table),
};

