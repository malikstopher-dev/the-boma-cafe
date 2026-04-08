'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const success = await login(password);
    
    if (success) {
      router.push('/admin/dashboard');
    } else {
      setError('Invalid password. Please try again.');
    }
    
    setIsLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--dark-brown) 0%, var(--dark-brown-light) 100%)',
      padding: '2rem'
    }}>
      <div style={{
        background: 'var(--white)',
        borderRadius: '24px',
        padding: '3rem',
        width: '100%',
        maxWidth: '450px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', color: 'var(--dark-brown)', marginBottom: '0.5rem' }}>Admin Login</h1>
          <p style={{ color: 'var(--text-light)' }}>Enter your password to access the dashboard</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '12px',
                border: '2px solid var(--cream)',
                background: 'var(--cream)',
                fontSize: '1rem',
                transition: 'all 0.3s ease'
              }}
              required
            />
          </div>

          {error && (
            <div style={{
              background: '#fee2e2',
              color: '#dc2626',
              padding: '0.75rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{ width: '100%', opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <a href="/" style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
            ← Back to Website
          </a>
        </div>
      </div>
    </div>
  );
}