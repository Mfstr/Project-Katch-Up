import { Link, useLocation } from 'react-router-dom';

export default function Authorize() {
    const location = useLocation();
    const isRegister = location.pathname === '/register';

    return (
        <main className="auth-page">
            <h1>{isRegister ? 'Register' : 'Login'}</h1>

            <form>
                <label htmlFor="email">Email</label>
                <input
                    id = "email"
                    name = "email"
                    type = "email"
                    autoComplete = "email"
                    required
                />

                <label htmlFor="password">Password</label>
                <input
                    id = "password"
                    name = "password"
                    type = "password"
                    autoComplete = {isRegister ? 'new-password' : 'current-password'}
                    required
                />

                <button type="submit">
                    {isRegister ? 'Create Account' : 'Login'}
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