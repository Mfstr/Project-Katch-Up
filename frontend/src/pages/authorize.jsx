import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { API_BASE_URL, storeSession } from '../services/apiClient.js';

export default function Authorize() {
    const location = useLocation();
    const navigate = useNavigate();
    const isRegister = location.pathname === '/register';
    
    const sessionExpired = new URLSearchParams(location.search).get('expired') === '1';
    const [error, setError] = useState(sessionExpired ? 'Your session has expired. Please log in again.' : '');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');
        const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';

        try {
            let res;
            try {
                res = await fetch(`${API_BASE_URL}${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
            } catch {
                throw new Error('Could not reach the server. It may be waking up; please try again in a minute.');
            }

            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(body.error || body.message || 'Authentication failed');
            }

            if (storeSession(body.session)) {
                navigate('/dashboard');
            } else if (isRegister && (body.user || body.id)) {
                setError('Account created. Please check your email to confirm your account, then log in.');
                navigate('/login');
            } else {
                throw new Error('No access token returned from server.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="auth-page">
            <h1>{isRegister ? 'Register' : 'Login'}</h1>
            
            {error && (
                <div style={{ color: 'red', marginBottom: '1rem' }} role="alert">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <label htmlFor="email">Email</label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                />

                <label htmlFor="password">Password</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    minLength={isRegister ? 8 : undefined}
                    maxLength={72}
                    required
                />

                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Processing...' : (isRegister ? 'Create Account' : 'Login')}
                </button>
            </form>

            <p>
                {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
                <Link to={isRegister ? '/login' : '/register'}>
                    {isRegister ? 'Login' : 'Register'}
                </Link>
            </p>
        </main>
    )
}