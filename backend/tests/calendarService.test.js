import { jest } from '@jest/globals';

// Create shared mock terminal functions for fluent chain resolution
const mockSingle = jest.fn();
const mockOrder = jest.fn();
const mockEqDelete = jest.fn();

// 1. Mock both supabaseClient and icalParser using unstable_mockModule with proper chain propagation
jest.unstable_mockModule('../src/supabaseClient.js', () => ({
    supabase: {
        from: jest.fn().mockReturnValue({
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: mockSingle,
                }),
            }),
            select: jest.fn().mockReturnValue({
                order: mockOrder,
                eq: jest.fn().mockReturnValue({
                    single: mockSingle,
                }),
            }),
            delete: jest.fn().mockReturnValue({
                eq: mockEqDelete,
            }),
        }),
    },
}));

jest.unstable_mockModule('../src/icalParser.js', () => ({
    syncCalendar: jest.fn(),
}));

const { addCalendar, listCalendars, deleteCalendar, syncCalendarById } = await import('../src/calendarService.js');
const { supabase } = await import('../src/supabaseClient.js');
const { syncCalendar } = await import('../src/icalParser.js');

describe('Calendar Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('addCalendar', () => {
        it('successfully inserts and returns a new calendar record', async () => {
            const mockRecord = {
                id: 'uuid-1',
                ical_url: 'https://example.com/calendar.ics',
                name: 'Work',
                description: 'Office schedule',
                created_at: '2026-01-01T00:00:00.000Z',
            };

            mockSingle.mockResolvedValueOnce({ data: mockRecord, error: null });

            const result = await addCalendar('https://example.com/calendar.ics', 'Work', 'Office schedule');

            expect(supabase.from).toHaveBeenCalledWith('calendar');
            expect(result).toEqual(mockRecord);
        });

        it('throws an error when calendar insertion fails', async () => {
            mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Duplicate entry' } });

            await expect(
                addCalendar('https://example.com/calendar.ics', 'Work')
            ).rejects.toThrow('Failed to add calendar: Duplicate entry');
        });
    });

    describe('listCalendars', () => {
        it('successfully retrieves a list of calendar records ordered by created_at', async () => {
            const mockRecords = [
                { id: '1', ical_url: 'url1', name: 'Cal 1', description: null, created_at: '2026-01-01' },
            ];

            mockOrder.mockResolvedValueOnce({ data: mockRecords, error: null });

            const result = await listCalendars();

            expect(supabase.from).toHaveBeenCalledWith('calendar');
            expect(result).toEqual(mockRecords);
        });

        it('throws an error when listing calendars fails', async () => {
            mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'Connection lost' } });

            await expect(listCalendars()).rejects.toThrow('Failed to list calendars: Connection lost');
        });
    });

    describe('deleteCalendar', () => {
        it('successfully deletes a calendar by ID', async () => {
            mockEqDelete.mockResolvedValueOnce({ error: null });

            await deleteCalendar('uuid-1');

            expect(supabase.from).toHaveBeenCalledWith('calendar');
            expect(mockEqDelete).toHaveBeenCalledWith('id', 'uuid-1');
        });

        it('throws an error when deletion fails', async () => {
            mockEqDelete.mockResolvedValueOnce({ error: { message: 'Not found' } });

            await expect(deleteCalendar('uuid-1')).rejects.toThrow('Failed to delete calendar: Not found');
        });
    });

    describe('syncCalendarById', () => {
        it('fetches calendar URL and triggers sync successfully', async () => {
            const mockCalendar = { ical_url: 'https://example.com/sync.ics' };
            mockSingle.mockResolvedValueOnce({ data: mockCalendar, error: null });
            syncCalendar.mockResolvedValueOnce(5); // 5 events synced

            const count = await syncCalendarById('uuid-1');

            expect(supabase.from).toHaveBeenCalledWith('calendar');
            expect(syncCalendar).toHaveBeenCalledWith('https://example.com/sync.ics');
            expect(count).toBe(5);
        });

        it('throws an error when calendar is not found during sync lookup', async () => {
            mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

            await expect(syncCalendarById('invalid-id')).rejects.toThrow('Calendar not found: invalid-id');
        });
    });
});