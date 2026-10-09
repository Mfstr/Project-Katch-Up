import { jest } from '@jest/globals';

// 1. Mock the Supabase client entirely using Jest mock functions
jest.unstable_mockModule('../src/supabaseClient.js', () => ({
    supabase: {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn(),
    },
}));

const { softDeleteTask } = await import('../src/taskService.js');
const { supabase } = await import('../src/supabaseClient.js');

describe('Task Service', () => {
    // Clear mock call histories and states before each test
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('softDeleteTask', () => {
        // Test the "happy path" when the soft delete update succeeds
        it('successfully soft-deletes a task by setting deleted_at timestamp', async () => {
            const taskId = 42;
            
            // Setup Supabase fluent method chain to resolve with no error
            supabase.eq.mockResolvedValueOnce({ error: null });

            // Call the function under test
            await softDeleteTask(taskId);

            // Verify the correct table was targeted
            expect(supabase.from).toHaveBeenCalledWith('tasks');
            
            // Verify that an update was called containing an ISO date string
            expect(supabase.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    deleted_at: expect.any(String),
                })
            );
            
            // Verify that the operation was restricted to the correct task ID
            expect(supabase.eq).toHaveBeenCalledWith('id', taskId);
        });

        // Test the "sad path" when Supabase returns a failure error
        it('throws an error when soft-delete operation fails in Supabase', async () => {
            const taskId = 42;
            const mockError = { message: 'Database connection timeout' };
            
            // Simulate a Supabase error response on the final chain method (.eq)
            supabase.eq.mockResolvedValueOnce({ error: mockError });

            // Verify that softDeleteTask catches the error and throws our custom message
            await expect(
                softDeleteTask(taskId)
            ).rejects.toThrow('Failed to delete task: Database connection timeout');
        });
    });
});