import { supabase } from './supabaseClient.js';
import { syncCalendar } from './icalParser.js';

export interface CalendarRecord {
  id: string;
  ical_url: string;
  name: string;
  description: string | null;
  created_at: string;
}

/**
 * Adds and registers a new iCal calendar feed subscription.
 *
 * @param url - The remote iCal HTTP(S) or webcal subscription URL.
 * @param name - Display label or identifier for the calendar.
 * @param description - Optional description of the calendar source.
 * @returns The newly created CalendarRecord database row.
 * @throws {Error} If inserting the calendar record fails.
 */
export const addCalendar = async (
  url: string,
  name: string,
  description?: string,
): Promise<CalendarRecord> => {
  const { data, error } = await supabase
    .from('calendar')
    .insert({ ical_url: url, name, description: description ?? null })
    .select()
    .single();

  if (error) throw new Error(`Failed to add calendar: ${error.message}`);
  return data as CalendarRecord;
};

/**
 * Lists all registered iCal calendars ordered by creation date ascending.
 *
 * @returns Array of registered CalendarRecord objects.
 * @throws {Error} If listing calendars fails in Supabase.
 */
export const listCalendars = async (): Promise<CalendarRecord[]> => {
  const { data, error } = await supabase
    .from('calendar')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to list calendars: ${error.message}`);
  return (data ?? []) as CalendarRecord[];
};

/**
 * Removes an iCal calendar registration by its unique identifier.
 *
 * @param id - UUID string of the calendar to delete.
 * @returns Resolves when the calendar is deleted.
 * @throws {Error} If deleting the calendar record fails.
 */
export const deleteCalendar = async (id: string): Promise<void> => {
  const { error } = await supabase.from('calendar').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete calendar: ${error.message}`);
};

/**
 * Triggers synchronization for a specific calendar by fetching and parsing its iCal feed.
 *
 * @param id - UUID string of the calendar to sync.
 * @returns The count of upcoming events upserted into tasks.
 * @throws {Error} If the calendar is not found or synchronization fails.
 */
export const syncCalendarById = async (id: string): Promise<number> => {
  const { data, error } = await supabase.from('calendar').select('ical_url').eq('id', id).single();

  if (error || !data) throw new Error(`Calendar not found: ${id}`);
  return syncCalendar((data as { ical_url: string }).ical_url);
};
