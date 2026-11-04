import { supabase } from './supabaseClient.js';

export const registerUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw new Error(`Registration failed: ${error.message}`);

  if (data?.user?.id && typeof supabase.from === 'function') {
    try {
      await supabase.from('profiles').upsert({ id: data.user.id }, { onConflict: 'id' });
    } catch {
      // In case database triggers or RLS handle profile provisioning
    }
  }

  return data;
};

export const loginUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(`Login failed: ${error.message}`);
  return data;
};

export const logoutUser = async (token?: string) => {
  if (token && typeof (supabase.auth as { admin?: { signOut?: (jwt: string) => Promise<{ error: Error | null }> } }).admin?.signOut === 'function') {
    try {
      const { error } = await (supabase.auth as unknown as { admin: { signOut: (jwt: string) => Promise<{ error: Error | null }> } }).admin.signOut(token);
      if (!error) {
        return { message: 'Logged out successfully' };
      }
    } catch {
      // Fall back to client signOut
    }
  }

  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`Logout failed: ${error.message}`);
  return { message: 'Logged out successfully' };
};

