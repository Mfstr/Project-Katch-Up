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
    listCalendars: jest.fn().mockResolvedValue([{ id: '1', name: 'Work', ical_url: 'https://example.com' }]),
    addCalendar: jest.fn().mockResolvedValue({ id: '2', name: 'New Cal', ical_url: 'https://example.com' }),
    deleteCalendar: jest.fn().mockResolvedValue(undefined),
    syncCalendarById: jest.fn().mockResolvedValue(3),
}));

jest.unstable_mockModule('../../src/taskService.js', () => ({
    softDeleteTask: jest.fn().mockResolvedValue(undefined),
    getNextTask: jest.fn().mockResolvedValue({ id: 1, title: 'Next Task' }),
    getAllTasks: jest.fn().mockResolvedValue([]),
}));

jest.unstable_mockModule('../../src/authService.js', () => ({
    registerUser: jest.fn().mockResolvedValue({ user: { id: '1' }, token: 'mock-jwt' }),
    loginUser: jest.fn().mockResolvedValue({ user: { id: '1' }, token: 'mock-jwt' }),
}));

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
        const response = await request(app)
            .post('/api/calendars')
            .send({ name: '' }); // missing url
        
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });

    it('POST /api/auth/login validates required credentials', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: 'test@example.com' }); // missing password

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('email and password are required.');
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