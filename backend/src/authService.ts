import { supabase } from './supabaseClient.js';

/**
 * Registers a new user account with email and password, provisioning their initial profile.
 *
 * @param email - The user's registration email address.
 * @param password - The user's plain-text account password.
 * @returns The Supabase signUp response object containing user credentials and session data.
 * @throws {Error} If registration fails or inputs are invalid.
 */
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

/**
 * Authenticates an existing user using email and password credentials.
 *
 * @param email - The user's account email address.
 * @param password - The user's account password.
 * @returns The Supabase authentication data containing the JWT access token and user metadata.
 * @throws {Error} If credentials are invalid or login fails.
 */
export const loginUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(`Login failed: ${error.message}`);
  return data;
};

/**
 * Terminates the active session and logs out the user, invalidating the session token.
 *
 * @param token - Optional JWT access token to invalidate via admin or client sign-out.
 * @returns A confirmation message indicating successful logout.
 * @throws {Error} If sign-out fails in Supabase.
 */
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

