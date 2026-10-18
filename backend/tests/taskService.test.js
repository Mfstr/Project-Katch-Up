import { jest } from '@jest/globals';

// Create a fluent mock chain for Supabase
const mockChain = {
  from: jest.fn(),
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  eq: jest.fn(),
  is: jest.fn(),
  order: jest.fn(),
  limit: jest.fn(),
  single: jest.fn(),
};

// Fluent default chaining
mockChain.from.mockReturnValue(mockChain);
mockChain.select.mockReturnValue(mockChain);
mockChain.insert.mockReturnValue(mockChain);
mockChain.update.mockReturnValue(mockChain);
mockChain.delete.mockReturnValue(mockChain);
mockChain.eq.mockReturnValue(mockChain);
mockChain.is.mockReturnValue(mockChain);
mockChain.order.mockReturnValue(mockChain);
mockChain.limit.mockReturnValue(mockChain);

jest.unstable_mockModule('../src/supabaseClient.js', () => ({
  supabase: mockChain,
}));

const { softDeleteTask, createTask, updateTask, getAllTasks, getTasks, getNextTask } =
  await import('../src/taskService.js');
const { supabase } = await import('../src/supabaseClient.js');

describe('Task Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Restore default chain returns in case a test overrode with mockResolvedValue
    mockChain.eq.mockReturnValue(mockChain);
    mockChain.order.mockReturnValue(mockChain);
    mockChain.single.mockReset();
  });

  describe('softDeleteTask', () => {
    it('successfully soft-deletes a task by setting deleted_at timestamp', async () => {
      const taskId = 42;
      supabase.eq.mockResolvedValueOnce({ error: null });

      await softDeleteTask(taskId);

      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(supabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_at: expect.any(String),
        }),
      );
      expect(supabase.eq).toHaveBeenCalledWith('id', taskId);
    });

    it('throws an error when soft-delete operation fails in Supabase', async () => {
      const taskId = 42;
      const mockError = { message: 'Database connection timeout' };
      supabase.eq.mockResolvedValueOnce({ error: mockError });

      await expect(softDeleteTask(taskId)).rejects.toThrow(
        'Failed to delete task: Database connection timeout',
      );
    });
  });

  describe('createTask', () => {
    it('successfully creates a task with normalized fields', async () => {
      const input = {
        title: 'New manual task',
        description: 'Task details',
        dueDate: '2026-10-25',
        isComplete: false,
        profileId: 'user-abc',
      };
      const mockRow = {
        id: 10,
        title: 'New manual task',
        description: 'Task details',
        due_date: '2026-10-25',
        is_complete: false,
        profile_id: 'user-abc',
        created_at: '2026-10-17T00:00:00.000Z',
      };
      mockChain.single.mockResolvedValueOnce({ data: mockRow, error: null });

      const result = await createTask(input);

      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(supabase.insert).toHaveBeenCalledWith({
        title: 'New manual task',
        description: 'Task details',
        due_date: '2026-10-25',
        is_complete: false,
        profile_id: 'user-abc',
      });
      expect(result.id).toBe(10);
      expect(result.title).toBe('New manual task');
      expect(result.dueDate).toBe('2026-10-25');
      expect(result.isComplete).toBe(false);
    });

    it('throws an error when task creation fails', async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'DB insert violation' },
      });

      await expect(createTask({ title: 'Faulty task' })).rejects.toThrow(
        'Failed to create task: DB insert violation',
      );
    });
  });

  describe('updateTask', () => {
    it('successfully updates a task and maps camelCase fields to snake_case', async () => {
      const mockRow = {
        id: 7,
        title: 'Updated title',
        description: 'Updated desc',
        due_date: '2026-11-01',
        is_complete: true,
        profile_id: 'user-1',
        created_at: '2026-10-17T00:00:00.000Z',
      };
      mockChain.single.mockResolvedValueOnce({ data: mockRow, error: null });

      const result = await updateTask(7, {
        title: 'Updated title',
        description: 'Updated desc',
        dueDate: '2026-11-01',
        isComplete: true,
      });

      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(supabase.update).toHaveBeenCalledWith({
        title: 'Updated title',
        description: 'Updated desc',
        due_date: '2026-11-01',
        is_complete: true,
      });
      expect(supabase.eq).toHaveBeenCalledWith('id', 7);
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Updated title');
      expect(result?.dueDate).toBe('2026-11-01');
      expect(result?.isComplete).toBe(true);
    });

    it('successfully updates a task using snake_case properties and deleted_at', async () => {
      const mockRow = {
        id: 8,
        title: 'Snake Title',
        description: 'Snake Desc',
        due_date: '2026-11-10',
        is_complete: true,
        deleted_at: '2026-11-10T12:00:00.000Z',
        profile_id: 'user-99',
      };
      mockChain.single.mockResolvedValueOnce({ data: mockRow, error: null });

      const result = await updateTask(8, {
        title: 'Snake Title',
        description: 'Snake Desc',
        due_date: '2026-11-10',
        is_complete: true,
        deleted_at: '2026-11-10T12:00:00.000Z',
        profile_id: 'user-99',
      });

      expect(supabase.update).toHaveBeenCalledWith({
        title: 'Snake Title',
        description: 'Snake Desc',
        due_date: '2026-11-10',
        is_complete: true,
        deleted_at: '2026-11-10T12:00:00.000Z',
        profile_id: 'user-99',
      });
      expect(result?.title).toBe('Snake Title');
    });

    it('returns null when task to update is not found (PGRST116)', async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows' },
      });

      const result = await updateTask(999, { title: 'Missing' });
      expect(result).toBeNull();
    });

    it('throws an error when task update fails for other database errors', async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { code: '42P01', message: 'Relation does not exist' },
      });

      await expect(updateTask(7, { title: 'Error task' })).rejects.toThrow(
        'Failed to update task: Relation does not exist',
      );
    });
  });

  describe('getAllTasks', () => {
    it('retrieves all tasks filtered by profileId when provided', async () => {
      const mockRows = [
        {
          id: 1,
          title: 'Task A',
          description: 'Details A',
          due_date: '2026-10-20',
          is_complete: false,
          profile_id: 'user-123',
          created_at: '2026-10-17T00:00:00.000Z',
        },
      ];
      mockChain.eq.mockResolvedValueOnce({ data: mockRows, error: null });

      const result = await getAllTasks('user-123');

      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(supabase.select).toHaveBeenCalledWith('*');
      expect(supabase.is).toHaveBeenCalledWith('deleted_at', null);
      expect(supabase.eq).toHaveBeenCalledWith('profile_id', 'user-123');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Task A');
      expect(result[0].dueDate).toBe('2026-10-20');
    });

    it('retrieves all tasks without profileId filter when omitted', async () => {
      const mockRows = [
        {
          id: 2,
          title: 'Task B',
          description: null,
          due_date: null,
          is_complete: true,
          profile_id: null,
          created_at: '2026-10-17T00:00:00.000Z',
        },
      ];
      mockChain.order.mockResolvedValueOnce({ data: mockRows, error: null });

      const result = await getAllTasks();

      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Task B');
    });

    it('aliases getTasks to getAllTasks', () => {
      expect(getTasks).toBe(getAllTasks);
    });

    it('throws an error when retrieving tasks fails', async () => {
      mockChain.eq.mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed network request' },
      });

      await expect(getAllTasks('user-123')).rejects.toThrow(
        'Failed to get tasks: Failed network request',
      );
    });
  });

  describe('getNextTask', () => {
    it('returns the next incomplete task for a user', async () => {
      const mockRow = {
        id: 3,
        title: 'Next up',
        description: 'Do this now',
        due_date: '2026-10-18',
        is_complete: false,
      };
      mockChain.single.mockResolvedValueOnce({ data: mockRow, error: null });

      const result = await getNextTask('user-123');

      expect(result).toEqual({
        id: 3,
        title: 'Next up',
        description: 'Do this now',
        dueDate: '2026-10-18',
        isComplete: false,
      });
    });

    it('returns null when no next task is found (PGRST116)', async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows' },
      });

      const result = await getNextTask('user-123');
      expect(result).toBeNull();
    });

    it('throws an error when querying next task fails', async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { code: '500', message: 'Query error' },
      });

      await expect(getNextTask('user-123')).rejects.toThrow('Failed to get next task: Query error');
    });
  });
});
