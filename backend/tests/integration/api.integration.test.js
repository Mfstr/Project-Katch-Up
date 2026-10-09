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