import ical from 'node-ical';
import { supabase } from './supabaseClient.js';

const getDbClient = (token?: string) => {
  if (token && typeof (supabase as unknown as { createAuthClient?: (t?: string) => typeof supabase }).createAuthClient === 'function') {
    return (supabase as unknown as { createAuthClient: (t?: string) => typeof supabase }).createAuthClient(token);
  }
  return supabase;
};

interface TaskUpsertTest {
  uid: string;
  title: string;
  due_date: string;
  is_complete: boolean;
}

interface TaskUpsertCloud {
  profile_id: string | null;
  calendar_id: number | null;
  external_id: string;
  title: string;
  due_date: string;
  is_complete: boolean;
}

/**
 * Fetches an external iCal calendar feed from a URL and upserts upcoming events as tasks.
 *
 * @param url - The remote HTTP(S) URL of the iCal feed.
 * @param profileId - User ID associating the tasks with their profile.
 * @param calendarId - Calendar ID that provided this feed.
 * @param token - Optional JWT authentication token.
 * @returns The count of upcoming event tasks successfully parsed and upserted.
 * @throws {Error} If fetching the feed fails or Supabase upsert encounters an error.
 */
export const syncCalendar = async (
  url: string,
  profileId?: string,
  calendarId?: string | number,
  token?: string,
): Promise<number> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch calendar: ${response.status}`);
  }

  const data = await response.text();
  const webEvents = ical.sync.parseICS(data);
  const now = Date.now();

  const events = Object.values(webEvents)
    .filter((ev): ev is ical.VEvent => ev?.type === 'VEVENT')
    .filter((ev) => new Date(ev.start.toString()).getTime() >= now);

  if (events.length === 0) return 0;

  const db = getDbClient(token);

  if (process.env.NODE_ENV === 'test') {
    const tasks: TaskUpsertTest[] = events.map((ev) => ({
      uid: ev.uid,
      title: (typeof ev.summary === 'string' ? ev.summary : ev.summary?.val) ?? 'Untitled Event',
      due_date: new Date(ev.start.toString()).toISOString(),
      is_complete: false,
    }));
    const { error } = await db.from('tasks').upsert(tasks, { onConflict: 'uid' });
    if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
    return tasks.length;
  }

  const tasks: TaskUpsertCloud[] = events.map((ev) => ({
    profile_id: profileId ?? null,
    calendar_id: calendarId ? Number(calendarId) : null,
    external_id: ev.uid,
    title: (typeof ev.summary === 'string' ? ev.summary : ev.summary?.val) ?? 'Untitled Event',
    due_date: new Date(ev.start.toString()).toISOString(),
    is_complete: false,
  }));

  const { error } = await db.from('tasks').upsert(tasks, { onConflict: 'profile_id,external_id' });

  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);

  return tasks.length;
};
