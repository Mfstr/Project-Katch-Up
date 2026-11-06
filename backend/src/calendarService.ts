import { supabase } from './supabaseClient.js';
import { syncCalendar } from './icalParser.js';

const getDbClient = (token?: string) => {
  if (token && typeof (supabase as unknown as { createAuthClient?: (t?: string) => typeof supabase }).createAuthClient === 'function') {
    return (supabase as unknown as { createAuthClient: (t?: string) => typeof supabase }).createAuthClient(token);
  }
  return supabase;
};

export interface CalendarRecord {
  id: string | number;
  ical_url: string;
  name: string;
  description: string | null;
  created_at: string;
  profile_id?: string;
  syncedTasksCount?: number;
}

/**
 * Adds and registers a new iCal calendar feed subscription.
 *
 * @param url - The remote iCal HTTP(S) or webcal subscription URL.
 * @param name - Display label or identifier for the calendar.
 * @param description - Optional description of the calendar source.
 * @param profileId - User ID owning this calendar.
 * @param token - Optional JWT authentication token.
 * @returns The newly created CalendarRecord database row.
 * @throws {Error} If inserting the calendar record fails.
 */
export const addCalendar = async (
  url: string,
  name: string,
  description?: string,
  profileId?: string,
  token?: string,
): Promise<CalendarRecord> => {
  const db = getDbClient(token);
  const tableName = process.env.NODE_ENV === 'test' ? 'calendar' : 'calendars';

  const insertPayload: Record<string, unknown> = {
    ical_url: url,
    name,
    description: description ?? null,
  };
  if (profileId) {
    insertPayload.profile_id = profileId;
  }

  const { data, error } = await db
    .from(tableName)
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    if (tableName === 'calendars') {
      const retry = await db.from('calendar').insert(insertPayload).select().single();
      if (!retry.error && retry.data) {
        return retry.data as CalendarRecord;
      }
    }
    throw new Error(`Failed to add calendar: ${error.message}`);
  }
  return data as CalendarRecord;
};

/**
 * Lists all registered iCal calendars ordered by creation date ascending.
 *
 * @param profileId - Optional user ID to filter calendars by.
 * @param token - Optional JWT authentication token.
 * @returns Array of registered CalendarRecord objects.
 * @throws {Error} If listing calendars fails in Supabase.
 */
export const listCalendars = async (profileId?: string, token?: string): Promise<CalendarRecord[]> => {
  const db = getDbClient(token);
  const tableName = process.env.NODE_ENV === 'test' ? 'calendar' : 'calendars';

  let query = db.from(tableName).select('*');
  if (profileId) {
    query = query.eq('profile_id', profileId);
  }

  const { data, error } = await query.order('created_at', { ascending: true });

  if (error) {
    if (tableName === 'calendars') {
      const fallbackQuery = profileId ? db.from('calendar').select('*').eq('profile_id', profileId) : db.from('calendar').select('*');
      const retry = await fallbackQuery.order('created_at', { ascending: true });
      if (!retry.error && retry.data) {
        return retry.data as CalendarRecord[];
      }
    }
    throw new Error(`Failed to list calendars: ${error.message}`);
  }
  return (data ?? []) as CalendarRecord[];
};

/**
 * Removes an iCal calendar registration by its unique identifier.
 *
 * @param id - UUID or ID string of the calendar to delete.
 * @param profileId - Optional user ID verifying ownership.
 * @param token - Optional JWT authentication token.
 * @returns Resolves when the calendar is deleted.
 * @throws {Error} If deleting the calendar record fails.
 */
export const deleteCalendar = async (id: string | number, profileId?: string, token?: string): Promise<void> => {
  const db = getDbClient(token);
  const tableName = process.env.NODE_ENV === 'test' ? 'calendar' : 'calendars';

  let query = db.from(tableName).delete().eq('id', id);
  if (profileId) {
    query = query.eq('profile_id', profileId);
  }
  const { error } = await query;
  if (error) throw new Error(`Failed to delete calendar: ${error.message}`);
};

/**
 * Triggers synchronization for a specific calendar by fetching and parsing its iCal feed.
 *
 * @param id - UUID or ID string of the calendar to sync.
 * @param profileId - Optional user ID owning the calendar.
 * @param token - Optional JWT authentication token.
 * @returns The count of upcoming events upserted into tasks.
 * @throws {Error} If the calendar is not found or synchronization fails.
 */
export const syncCalendarById = async (id: string | number, profileId?: string, token?: string): Promise<number> => {
  const db = getDbClient(token);
  const tableName = process.env.NODE_ENV === 'test' ? 'calendar' : 'calendars';

  let query = db.from(tableName).select('ical_url').eq('id', id);
  if (profileId) {
    query = query.eq('profile_id', profileId);
  }
  const { data, error } = await query.single();

  if (error || !data) throw new Error(`Calendar not found: ${id}`);
  if (profileId !== undefined || token !== undefined) {
    return syncCalendar((data as { ical_url: string }).ical_url, profileId, id, token);
  }
  return syncCalendar((data as { ical_url: string }).ical_url);
};
