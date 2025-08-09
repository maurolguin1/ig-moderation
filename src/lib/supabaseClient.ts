import { createClient } from '@supabase/supabase-js';

// Client for browser (public)
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

// Client for server (service role) - use only in API routes
export const supabaseServerClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  // Use service role key if available, fallback to anon
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string
);