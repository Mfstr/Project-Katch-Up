import { supabase } from './supabaseClient.js';
import { syncCalendar } from './icalParser.js';
export const addCalendar = async (url, name, description) => {
    const { data, error } = await supabase
        .from('calendar')
        .insert({ ical_url: url, name, description: description ?? null })
        .select()
        .single();
    if (error)
        throw new Error(`Failed to add calendar: ${error.message}`);
    return data;
};
export const listCalendars = async () => {
    const { data, error } = await supabase
        .from('calendar')
        .select('*')
        .order('created_at', { ascending: true });
    if (error)
        throw new Error(`Failed to list calendars: ${error.message}`);
    return (data ?? []);
};
export const deleteCalendar = async (id) => {
    const { error } = await supabase.from('calendar').delete().eq('id', id);
    if (error)
        throw new Error(`Failed to delete calendar: ${error.message}`);
};
export const syncCalendarById = async (id) => {
    const { data, error } = await supabase
        .from('calendar')
        .select('ical_url')
        .eq('id', id)
        .single();
    if (error || !data)
        throw new Error(`Calendar not found: ${id}`);
    return syncCalendar(data.ical_url);
};
//# sourceMappingURL=calendarService.js.map