import { jest } from '@jest/globals';

// Create shared mock functions for fetch and supabase upsert
const mockUpsert = jest.fn();

// 1. Mock supabaseClient and node-ical using unstable_mockModule
jest.unstable_mockModule('../src/supabaseClient.js', () => ({
    supabase: {
        from: jest.fn().mockReturnValue({
            upsert: mockUpsert,
        }),
    },
}));

jest.unstable_mockModule('node-ical', () => ({
    default: {
        sync: {
            parseICS: jest.fn(),
        },
    },
}));

const { syncCalendar } = await import('../src/icalParser.js');
const { supabase } = await import('../src/supabaseClient.js');
const ical = (await import('node-ical')).default;

describe('iCal Parser Service (syncCalendar)', () => {
    let originalFetch;

    beforeEach(() => {
        jest.clearAllMocks();
        originalFetch = global.fetch;
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('throws an error when fetching the calendar URL fails', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 404,
        });

        await expect(
            syncCalendar('https://example.com/bad-calendar.ics')
        ).rejects.toThrow('Failed to fetch calendar: 404');
    });

    it('returns 0 and skips upsert when no future VEVENT items are found', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            text: jest.fn().mockResolvedValue('BEGIN:VCALENDAR...END:VCALENDAR'),
        });

        // Return empty events or past events
        const pastDate = new Date(Date.now() - 86400000); // Yesterday
        ical.sync.parseICS.mockReturnValue({
            'event-1': {
                type: 'VEVENT',
                uid: 'uid-1',
                summary: 'Past Event',
                start: pastDate,
            },
        });

        const count = await syncCalendar('https://example.com/calendar.ics');

        expect(count).toBe(0);
        expect(supabase.from).not.toHaveBeenCalled();
    });

    it('successfully parses future events and upserts them to Supabase', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            text: jest.fn().mockResolvedValue('BEGIN:VCALENDAR...END:VCALENDAR'),
        });

        const futureDate = new Date(Date.now() + 86400000); // Tomorrow
        ical.sync.parseICS.mockReturnValue({
            'event-1': {
                type: 'VEVENT',
                uid: 'uid-1',
                summary: 'Future Team Sync',
                start: futureDate,
            },
        });

        mockUpsert.mockResolvedValueOnce({ error: null });

        const count = await syncCalendar('https://example.com/calendar.ics');

        expect(count).toBe(1);
        expect(supabase.from).toHaveBeenCalledWith('tasks');
        expect(mockUpsert).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    uid: 'uid-1',
                    title: 'Future Team Sync',
                    is_complete: false,
                }),
            ]),
            { onConflict: 'uid' }
        );
    });

    it('throws an error when Supabase batch upsert fails', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            text: jest.fn().mockResolvedValue('BEGIN:VCALENDAR...END:VCALENDAR'),
        });

        const futureDate = new Date(Date.now() + 86400000);
        ical.sync.parseICS.mockReturnValue({
            'event-1': {
                type: 'VEVENT',
                uid: 'uid-1',
                summary: 'Future Event',
                start: futureDate,
            },
        });

        mockUpsert.mockResolvedValueOnce({ error: { message: 'Database constraint violation' } });

        await expect(
            syncCalendar('https://example.com/calendar.ics')
        ).rejects.toThrow('Supabase upsert failed: Database constraint violation');
    });
});