import { supabase } from './supabaseClient.js';

export const registerUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw new Error(`Registration failed: ${error.message}`);
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
