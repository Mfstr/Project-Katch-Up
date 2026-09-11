import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const finalUrl = supabaseUrl || 'https://mock.supabase.co';
const finalKey = supabaseKey || 'mock-key';
if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ WARNING: Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment. Running with mock client.');
}
export const supabase = createClient(finalUrl, finalKey);
//# sourceMappingURL=supabaseClient.js.map