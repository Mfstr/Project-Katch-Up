import { jest } from '@jest/globals';

// 1. Mock the Supabase client entirely using inline jest.fn() builders
jest.unstable_mockModule('../src/supabaseClient.js', () => ({
    supabase: {
        auth: {
            signUp: jest.fn(),
            signInWithPassword: jest.fn(),
        },
    },
}));

const { registerUser, loginUser } = await import('../src/authService.js');
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
});