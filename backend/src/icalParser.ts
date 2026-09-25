import ical from 'node-ical';
import { supabase } from './supabaseClient.js';

interface TaskUpsert {
    uid: string;
    title: string;
    due_date: string;
    is_complete: boolean;
}

/** Returns the number of tasks upserted. */
export const syncCalendar = async (url: string): Promise<number> => {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch calendar: ${response.status}`);
    }

    const data = await response.text();
    const webEvents = ical.sync.parseICS(data);
    const now = Date.now();

    const tasks: TaskUpsert[] = Object.values(webEvents)
        .filter((ev): ev is ical.VEvent => ev?.type === 'VEVENT')
        .filter(ev => new Date(ev.start.toString()).getTime() >= now)
        .map(ev => ({
            uid: ev.uid,
            title: (typeof ev.summary === 'string' ? ev.summary : ev.summary?.val) ?? 'Untitled Event',
            due_date: new Date(ev.start.toString()).toISOString(),
            is_complete: false,
        }));

    if (tasks.length === 0) return 0;

    const { error } = await supabase
        .from('tasks')
        .upsert(tasks, { onConflict: 'uid' });

    if (error) throw new Error(`Supabase upsert failed: ${error.message}`);

    return tasks.length;
};
