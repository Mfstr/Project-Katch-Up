import { createIsolatedClient } from './supabaseClient.js';

// Every auth call uses its own short-lived client. Sessions must never be stored on the shared
// server client, otherwise one user's session could be used for another user's requests.

/**
 * Registers a new user account with email and password, provisioning their initial profile.
 *
 * @param email - The user's registration email address.
 * @param password - The user's plain-text account password.
 * @returns The Supabase signUp response object containing user credentials and session data.
 * @throws {Error} If registration fails or inputs are invalid.
 */
export const registerUser = async (email: string, password: string) => {
  const client = createIsolatedClient();

  const { data, error } = await client.auth.signUp({
    email,
    password,
  });

  if (error) throw new Error(`Registration failed: ${error.message}`);

  // Profiles are created by the on_auth_user_created database trigger.
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
  const client = createIsolatedClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(`Login failed: ${error.message}`);
  return data;
};

/**
 * Exchanges a refresh token for a new session so users stay signed in past the
 * one-hour access token lifetime.
 *
 * @param refreshToken - The refresh token issued at login.
 * @returns The refreshed Supabase session data.
 * @throws {Error} If the refresh token is invalid or expired.
 */
export const refreshUserSession = async (refreshToken: string) => {
  const client = createIsolatedClient();
  const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });

  if (error || !data.session) throw new Error(`Session refresh failed: ${error?.message ?? 'no session returned'}`);
  return data;
};

/**
 * Terminates the active session and logs out the user, invalidating the session token.
 *
 * @param token - JWT access token of the session to invalidate.
 * @returns A confirmation message indicating successful logout.
 * @throws {Error} If sign-out fails in Supabase.
 */
export const logoutUser = async (token?: string) => {
  if (!token) {
    return { message: 'Logged out successfully' };
  }

  const client = createIsolatedClient();
  const { error } = await client.auth.admin.signOut(token);
  if (error) throw new Error(`Logout failed: ${error.message}`);
  return { message: 'Logged out successfully' };
};
