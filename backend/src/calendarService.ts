import { supabase } from './supabaseClient.js';
import { syncCalendar } from './icalParser.js';

export interface CalendarRecord {
    id: string;
    ical_url: string;
    name: string;
    description: string | null;
    created_at: string;
}

export const addCalendar = async (
    url: string,
    name: string,
    description?: string
): Promise<CalendarRecord> => {
    const { data, error } = await supabase
        .from('calendar')
        .insert({ ical_url: url, name, description: description ?? null })
        .select()
        .single();

    if (error) throw new Error(`Failed to add calendar: ${error.message}`);
    return data as CalendarRecord;
};

export const listCalendars = async (): Promise<CalendarRecord[]> => {
    const { data, error } = await supabase
        .from('calendar')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to list calendars: ${error.message}`);
    return (data ?? []) as CalendarRecord[];
};

export const deleteCalendar = async (id: string): Promise<void> => {
    const { error } = await supabase.from('calendar').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete calendar: ${error.message}`);
};

export const syncCalendarById = async (id: string): Promise<number> => {
    const { data, error } = await supabase
        .from('calendar')
        .select('ical_url')
        .eq('id', id)
        .single();

    if (error || !data) throw new Error(`Calendar not found: ${id}`);
    return syncCalendar((data as { ical_url: string }).ical_url);
};
