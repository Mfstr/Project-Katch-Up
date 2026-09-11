export interface CalendarRecord {
    id: string;
    ical_url: string;
    name: string;
    description: string | null;
    created_at: string;
}
export declare const addCalendar: (url: string, name: string, description?: string) => Promise<CalendarRecord>;
export declare const listCalendars: () => Promise<CalendarRecord[]>;
export declare const deleteCalendar: (id: string) => Promise<void>;
export declare const syncCalendarById: (id: string) => Promise<number>;
//# sourceMappingURL=calendarService.d.ts.map