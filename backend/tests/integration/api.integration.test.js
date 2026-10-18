import { jest } from '@jest/globals';
import request from 'supertest';

// Mock verifyToken middleware to allow integration tests to pass through cleanly
jest.unstable_mockModule('../../src/verifyToken.js', () => ({
  verifyToken: (req, res, next) => {
    req.user = { id: 'test-user-id' };
    next();
  },
}));

// Mock service functions called by the routes
jest.unstable_mockModule('../../src/calendarService.js', () => ({
  listCalendars: jest
    .fn()
    .mockResolvedValue([{ id: '1', name: 'Work', ical_url: 'https://example.com' }]),
  addCalendar: jest
    .fn()
    .mockResolvedValue({ id: '2', name: 'New Cal', ical_url: 'https://example.com' }),
  deleteCalendar: jest.fn().mockResolvedValue(undefined),
  syncCalendarById: jest.fn().mockResolvedValue(3),
}));

jest.unstable_mockModule('../../src/taskService.js', () => ({
  softDeleteTask: jest.fn().mockResolvedValue(undefined),
  getNextTask: jest.fn().mockResolvedValue({ id: 1, title: 'Next Task' }),
  getAllTasks: jest.fn().mockResolvedValue([]),
  getTasks: jest.fn().mockResolvedValue([]),
  createTask: jest.fn().mockResolvedValue({ id: 1, title: 'New Task' }),
  updateTask: jest.fn().mockResolvedValue({ id: 1, title: 'Updated Task' }),
}));

jest.unstable_mockModule('../../src/authService.js', () => ({
  registerUser: jest.fn().mockResolvedValue({ user: { id: '1' }, token: 'mock-jwt' }),
  loginUser: jest.fn().mockResolvedValue({ user: { id: '1' }, token: 'mock-jwt' }),
}));

const { createTask, updateTask, getAllTasks } = await import('../../src/taskService.js');

// Import app after mocking modules
const app = (await import('../../src/index.ts')).default;

describe('E2E API Integration & Contract Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/calendars returns list of calendars', async () => {
    const response = await request(app).get('/api/calendars');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0].name).toBe('Work');
  });

  it('POST /api/calendars validates required fields', async () => {
    const response = await request(app).post('/api/calendars').send({ name: '' }); // missing url

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('POST /api/auth/login validates required credentials', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'test@example.com' }); // missing password

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('email and password are required.');
  });

  it('GET /api/tasks returns list of tasks for authenticated user', async () => {
    const mockTasks = [{ id: 1, title: 'Test Task', dueDate: '2026-10-20', isComplete: false }];
    getAllTasks.mockResolvedValueOnce(mockTasks);

    const response = await request(app).get('/api/tasks');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockTasks);
    expect(getAllTasks).toHaveBeenCalledWith('test-user-id');
  });

  it('POST /api/tasks creates a task with valid data', async () => {
    const newTask = { title: 'New manual task', description: 'Task notes' };
    const createdTask = { id: 101, ...newTask, isComplete: false, profile_id: 'test-user-id' };
    createTask.mockResolvedValueOnce(createdTask);

    const response = await request(app).post('/api/tasks').send(newTask);

    expect(response.status).toBe(201);
    expect(response.body).toEqual(createdTask);
    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New manual task',
        profile_id: 'test-user-id',
      }),
    );
  });

  it('POST /api/tasks rejects requests with missing or empty title', async () => {
    const response = await request(app).post('/api/tasks').send({ description: 'No title' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'title is required.' });
  });

  it('PUT /api/tasks/:id updates a task successfully', async () => {
    const updates = { title: 'Updated title', isComplete: true };
    const updatedTask = { id: 10, title: 'Updated title', isComplete: true };
    updateTask.mockResolvedValueOnce(updatedTask);

    const response = await request(app).put('/api/tasks/10').send(updates);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(updatedTask);
    expect(updateTask).toHaveBeenCalledWith(10, updates);
  });

  it('PUT /api/tasks/:id rejects invalid non-numeric IDs', async () => {
    const response = await request(app).put('/api/tasks/xyz').send({ title: 'New Title' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid task ID');
  });

  it('PUT /api/tasks/:id returns 404 when task does not exist', async () => {
    updateTask.mockResolvedValueOnce(null);

    const response = await request(app).put('/api/tasks/999').send({ title: 'Non-existent task' });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Task not found');
  });

  it('GET /api/tasks returns 500 when service fails', async () => {
    getAllTasks.mockRejectedValueOnce(new Error('Database offline'));

    const response = await request(app).get('/api/tasks');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Database offline' });
  });

  it('GET /api/tasks/next returns next task when available', async () => {
    const nextTask = { id: 2, title: 'Upcoming Task' };
    const { getNextTask } = await import('../../src/taskService.js');
    getNextTask.mockResolvedValueOnce(nextTask);

    const response = await request(app).get('/api/tasks/next');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(nextTask);
  });

  it('GET /api/tasks/next returns 404 when no upcoming tasks exist', async () => {
    const { getNextTask } = await import('../../src/taskService.js');
    getNextTask.mockResolvedValueOnce(null);

    const response = await request(app).get('/api/tasks/next');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'No upcoming tasks found.' });
  });

  it('POST /api/tasks returns 500 when createTask fails', async () => {
    createTask.mockRejectedValueOnce(new Error('Insert error'));

    const response = await request(app).post('/api/tasks').send({ title: 'Valid title' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Insert error' });
  });

  it('PUT /api/tasks/:id returns 500 when updateTask fails', async () => {
    updateTask.mockRejectedValueOnce(new Error('Update failed in db'));

    const response = await request(app).put('/api/tasks/10').send({ title: 'New title' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Update failed in db' });
  });

  it('DELETE /api/tasks/:id handles valid task soft-delete', async () => {
    const response = await request(app).delete('/api/tasks/10');
    expect(response.status).toBe(204);
  });

  it('DELETE /api/tasks/:id rejects invalid non-numeric IDs', async () => {
    const response = await request(app).delete('/api/tasks/abc');
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid task ID');
  });
});
