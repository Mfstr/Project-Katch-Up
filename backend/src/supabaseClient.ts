import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) in environment.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const createAuthClient = (token?: string) => {
  if (token) {
    return createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });
  }
  return supabase;
};

// Also attach to supabase instance so modules that only import `supabase` can access it safely
(supabase as unknown as { createAuthClient?: typeof createAuthClient }).createAuthClient = createAuthClient;
