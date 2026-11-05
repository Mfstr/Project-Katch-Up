import { supabase } from './supabaseClient.js';
import { logger } from './logger.js';

export interface ReadinessStatus {
  status: 'ready' | 'unavailable';
  database: 'connected' | 'disconnected';
  timestamp: string;
  error?: string | undefined;
}

export async function pingSupabase(): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('tasks').select('id').limit(1);
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

export async function checkReadiness(): Promise<ReadinessStatus> {
  const ping = await pingSupabase();
  const timestamp = new Date().toISOString();

  if (ping.ok) {
    return {
      status: 'ready',
      database: 'connected',
      timestamp,
    };
  }

  logger.warn({ error: ping.error }, 'Readiness probe failed: unable to ping Supabase');
  return {
    status: 'unavailable',
    database: 'disconnected',
    timestamp,
    error: ping.error,
  };
}
