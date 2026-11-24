import { jest } from '@jest/globals';

// 1. Mock the Supabase client entirely using inline jest.fn() builders
// authService builds a fresh client per call via createIsolatedClient; return one shared mock
const isolatedClient = {
    auth: {
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
        signOut: jest.fn(),
        refreshSession: jest.fn(),
        admin: { signOut: jest.fn() },
    },
};
jest.unstable_mockModule('../src/supabaseClient.js', () => ({
    supabase: isolatedClient,
    createIsolatedClient: jest.fn(() => isolatedClient),
}));

const { registerUser, loginUser, logoutUser, refreshUserSession } = await import('../src/authService.js');
const { supabase } = await import('../src/supabaseClient.js');

describe('Auth Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('registerUser', () => {
        it('successfully registers a user when valid credentials are provided', async () => {
            const mockUser = { user: { id: '123', email: 'test@example.com' }, session: null };
            
            // Directly target the imported mock function
            supabase.auth.signUp.mockResolvedValueOnce({ data: mockUser, error: null });

            const result = await registerUser('test@example.com', 'securePassword123');

            expect(supabase.auth.signUp).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'securePassword123',
            });
            expect(result).toEqual(mockUser);
        });

        it('throws an error when registration fails', async () => {
            const mockError = { message: 'User already registered' };
            
            supabase.auth.signUp.mockResolvedValueOnce({ data: null, error: mockError });

            await expect(
                registerUser('test@example.com', 'short')
            ).rejects.toThrow('Registration failed: User already registered');
        });
    });

    describe('loginUser', () => {
        it('successfully logs in a user with correct credentials', async () => {
            const mockSession = { session: { access_token: 'fake-jwt-token' }, user: { id: '123' } };
            
            supabase.auth.signInWithPassword.mockResolvedValueOnce({ data: mockSession, error: null });

            const result = await loginUser('test@example.com', 'securePassword123');

            expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'securePassword123',
            });
            expect(result).toEqual(mockSession);
        });

        it('throws an error when login fails', async () => {
            const mockError = { message: 'Invalid login credentials' };
            
            supabase.auth.signInWithPassword.mockResolvedValueOnce({ data: null, error: mockError });

            await expect(
                loginUser('wrong@example.com', 'wrongpassword')
            ).rejects.toThrow('Login failed: Invalid login credentials');
        });
    });

    describe('logoutUser', () => {
        it('revokes the session for the given access token', async () => {
            supabase.auth.admin.signOut.mockResolvedValueOnce({ error: null });

            const result = await logoutUser('fake-token');

            expect(supabase.auth.admin.signOut).toHaveBeenCalledWith('fake-token');
            expect(result).toEqual({ message: 'Logged out successfully' });
        });

        it('is a no-op without a token and never signs out the shared client', async () => {
            const result = await logoutUser();

            expect(supabase.auth.admin.signOut).not.toHaveBeenCalled();
            expect(supabase.auth.signOut).not.toHaveBeenCalled();
            expect(result).toEqual({ message: 'Logged out successfully' });
        });

        it('throws an error when logout fails', async () => {
            const mockError = { message: 'Session expired or invalid' };
            supabase.auth.admin.signOut.mockResolvedValueOnce({ error: mockError });

            await expect(
                logoutUser('expired-token')
            ).rejects.toThrow('Logout failed: Session expired or invalid');
        });
    });

    describe('refreshUserSession', () => {
        it('returns a new session for a valid refresh token', async () => {
            const refreshed = { session: { access_token: 'new-jwt', refresh_token: 'new-refresh' }, user: { id: '123' } };
            supabase.auth.refreshSession.mockResolvedValueOnce({ data: refreshed, error: null });

            const result = await refreshUserSession('old-refresh');

            expect(supabase.auth.refreshSession).toHaveBeenCalledWith({ refresh_token: 'old-refresh' });
            expect(result).toEqual(refreshed);
        });

        it('throws when the refresh token is rejected', async () => {
            supabase.auth.refreshSession.mockResolvedValueOnce({
                data: { session: null, user: null },
                error: { message: 'Invalid Refresh Token' },
            });

            await expect(refreshUserSession('bad')).rejects.toThrow('Session refresh failed: Invalid Refresh Token');
        });
    });
});
