import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function Authorize() {
    const location = useLocation();
    const navigate = useNavigate();
    const isRegister = location.pathname === '/register';
    
    const [error, setError] = useState('');
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
            const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:5050';
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const body = await res.json();
            if (!res.ok) {
                throw new Error(body.error || body.message || 'Authentication failed');
            }

            const token = body.session?.access_token;
            if (token) {
                localStorage.setItem('authToken', token);
                navigate('/');
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
                    defaultValue="alex@example.com"
                    required
                />

                <label htmlFor="password">Password</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    defaultValue="password123"
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