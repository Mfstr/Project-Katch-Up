import 'dotenv/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) in environment.');
}

// This is a server: never keep a user session on a client instance. A session stored on a
// shared client would make every later query on that client run as the last user who logged in.
const serverAuthOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const;

/** Shared client for stateless calls (e.g. verifying a JWT). Never call sign-in methods on it. */
export const supabase = createClient(supabaseUrl, supabaseKey, { auth: serverAuthOptions });

/**
 * Creates a fresh, single-use client. Use for sign-in, sign-up and token refresh so the
 * resulting session lives only for the duration of one request.
 */
export const createIsolatedClient = (): SupabaseClient =>
  createClient(supabaseUrl, supabaseKey, { auth: serverAuthOptions });

/**
 * Creates a client whose database requests run as the user who owns `token`,
 * so Row Level Security policies apply to every query.
 */
export const createAuthClient = (token?: string) => {
  if (token) {
    return createClient(supabaseUrl, supabaseKey, {
      auth: serverAuthOptions,
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });
  }
  return supabase;
};

// Also attach to supabase instance so modules that only import `supabase` can access it safely
(supabase as unknown as { createAuthClient?: typeof createAuthClient }).createAuthClient = createAuthClient;
