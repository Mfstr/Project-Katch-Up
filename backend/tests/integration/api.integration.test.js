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
  logoutUser: jest.fn().mockResolvedValue({ message: 'Logged out successfully' }),
}));

jest.unstable_mockModule('../../src/insightsService.js', () => ({
  getTimerInsights: jest.fn().mockResolvedValue({
    recommendations: [
      {
        id: 'shorten_break_duration',
        type: 'break_duration',
        title: 'Shorter Break Recommended',
        message: 'You often end breaks early. Consider setting break interval to 3 minutes.',
        severity: 'tip',
        suggestedAction: { target: 'break_interval', value: 3, unit: 'minutes' },
      },
    ],
    statistics: {
      totalFocusMinutes: 100,
      totalBreakMinutes: 15,
      totalSessions: 5,
      completedSessions: 4,
      interruptedSessions: 1,
      completionRate: 80,
      averageFocusDurationMinutes: 25,
      dailyBreakdown: [],
      weekdayDistribution: {},
    },
    streak: {
      currentStreak: 3,
      longestStreak: 5,
      lastActiveDate: '2026-11-03',
      todayCompleted: true,
    },
    preferences: {
      focusInterval: 25,
      breakInterval: 5,
      pomodoroCycles: 4,
    },
  }),
  applyRecommendation: jest.fn().mockResolvedValue({
    success: true,
    updatedSettings: { breakInterval: 3 },
  }),
  recordSession: jest.fn().mockResolvedValue({
    id: 1,
    sessionType: 'focus',
    plannedDurationSeconds: 1500,
    actualDurationSeconds: 1500,
    isCompleted: true,
  }),
  getUserSessions: jest.fn().mockResolvedValue([
    { id: 1, sessionType: 'focus', isCompleted: true },
  ]),
  getUserPreferences: jest.fn().mockResolvedValue({
    focusInterval: 25,
    breakInterval: 5,
    pomodoroCycles: 4,
  }),
}));

jest.unstable_mockModule('../../src/healthService.js', () => ({
  checkReadiness: jest.fn().mockResolvedValue({
    status: 'ready',
    database: 'connected',
    timestamp: '2026-11-01T00:00:00.000Z',
  }),
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

    it('DELETE /api/tasks/:id rejects invalid non-numeric IDs', async () => {
        const response = await request(app).delete('/api/tasks/abc');
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid task ID');
    });
});

// Write additional tests centralized error handling added to index.ts
describe('API Error Handling & Edge Cases', () => {
  it('should return 400 when missing required fields on calendar creation', async () => {
    const res = await request(app)
      .post('/api/calendars')
      .set('Authorization', 'Bearer mock-valid-token')
      .send({}); // Missing url and name

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 when invalid task ID format is passed', async () => {
    const res = await request(app)
      .delete('/api/tasks/not-a-number')
      .set('Authorization', 'Bearer mock-valid-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid task ID');
  });

  it('should return 401/400 on malformed auth login requests', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' }); // Missing password

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('email and password are required.');
  });
});

describe('Pomodoro Timer Routes', () => {
  it('POST /api/timer/start starts the timer', async () => {
    const res = await request(app).post('/api/timer/start');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('endTime');
  });

  it('GET /api/timer/status returns timer status', async () => {
    const res = await request(app).get('/api/timer/status');
    expect(res.status).toBe(200);
  });

  it('POST /api/timer/pause pauses the timer', async () => {
    const res = await request(app).post('/api/timer/pause');
    expect(res.status).toBe(200);
  });

  it('POST /api/timer/complete completes the phase', async () => {
    const res = await request(app).post('/api/timer/complete');
    expect(res.status).toBe(200);
  });

  it('POST /api/timer/reset resets the timer', async () => {
    const res = await request(app).post('/api/timer/reset');
    expect(res.status).toBe(200);
  });
});

describe('Additional Task & Calendar Routes', () => {
  it('GET /api/tasks returns all tasks', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/tasks/next returns the next task', async () => {
    const res = await request(app).get('/api/tasks/next');
    expect(res.status).toBe(200);
  });

  it('DELETE /api/calendars/:id deletes a calendar', async () => {
    const res = await request(app).delete('/api/calendars/1');
    expect(res.status).toBe(204);
  });

  it('POST /api/calendars/:id/sync syncs a calendar', async () => {
    const res = await request(app).post('/api/calendars/1/sync');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('count');
  });

  it('POST /api/auth/register registers a user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@example.com', password: 'securepassword' });
    expect(res.status).toBe(201);
  });
});

describe('Server Error Catch Blocks & Global Error Handler', () => {
  it('should return 500 when calendar service throws an error', async () => {
    // Dynamically override listCalendars to throw an error for this test
    const calendarService = await import('../../src/calendarService.js');
    jest.spyOn(calendarService, 'listCalendars').mockRejectedValueOnce(new Error('DB Fail'));

    const res = await request(app).get('/api/calendars');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
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

  it('GET /api/tasks/next returns 500 when getNextTask service fails', async () => {
    const { getNextTask } = await import('../../src/taskService.js');
    getNextTask.mockRejectedValueOnce(new Error('Query failed'));

    const response = await request(app).get('/api/tasks/next');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Query failed' });
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

  describe('Auth Routes - Logout', () => {
    it('POST /api/auth/logout logs out user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('Timer Insights & Habits Routes', () => {
    it('GET /api/timer/insights returns recommendations, statistics, and streak', async () => {
      const response = await request(app).get('/api/timer/insights');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('recommendations');
      expect(response.body).toHaveProperty('statistics');
      expect(response.body).toHaveProperty('streak');
      expect(response.body).toHaveProperty('preferences');
      expect(Array.isArray(response.body.recommendations)).toBe(true);
      expect(response.body.recommendations[0].id).toBe('shorten_break_duration');
      expect(response.body.streak.currentStreak).toBe(3);
    });

    it('POST /api/timer/insights/apply validates required target and value', async () => {
      const response = await request(app)
        .post('/api/timer/insights/apply')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('target and value are required');
    });

    it('POST /api/timer/insights/apply successfully applies recommended setting', async () => {
      const response = await request(app)
        .post('/api/timer/insights/apply')
        .send({ target: 'break_interval', value: 3 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('updatedSettings');
    });

    it('POST /api/timer/sessions records a completed pomodoro session', async () => {
      const newSession = {
        sessionType: 'focus',
        plannedDurationSeconds: 1500,
        actualDurationSeconds: 1500,
        isCompleted: true,
      };

      const response = await request(app)
        .post('/api/timer/sessions')
        .send(newSession);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('sessionType', 'focus');
    });

    it('GET /api/timer/sessions returns user session history', async () => {
      const response = await request(app).get('/api/timer/sessions');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].sessionType).toBe('focus');
    });

    it('GET /api/timer/preferences returns user intervals', async () => {
      const response = await request(app).get('/api/timer/preferences');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('focusInterval', 25);
      expect(response.body).toHaveProperty('breakInterval', 5);
    });

    it('PUT /api/timer/preferences updates user intervals', async () => {
      const response = await request(app)
        .put('/api/timer/preferences')
        .send({ break_interval: 3, focus_interval: 20 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('updatedSettings');
    });
  });