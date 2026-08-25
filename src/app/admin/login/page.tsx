'use client';

import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import PremiumAuthShell from '@/components/auth/PremiumAuthShell';

interface PublicAccount {
  username: string;
  display_name: string;
  role: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  full_manager: 'Main Manager',
  manager: 'Manager',
  assistant_manager: 'Assistant Manager',
};

function LoginForm() {
  const [accounts, setAccounts] = useState<PublicAccount[]>([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  useEffect(() => {
    fetch('/api/admin/accounts/public')
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => {
        const list = Array.isArray(json?.data) ? json.data : [];
        setAccounts(list);
        if (list.length > 0) setUsername(list[0].username);
      })
      .catch(() => { /* dropdown empty → legacy password-only mode */ })
      .finally(() => setAccountsLoaded(true));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const success = await login(username, password);

    if (success) {
      router.replace(redirectTo);
      router.refresh();
    } else {
      setError('Invalid credentials. Please try again.');
    }

    setIsLoading(false);
  };

  return (
    <PremiumAuthShell eyebrow="Boma Cafe / Admin" title="Welcome back." subtitle="Sign in to the management workspace. Every action is recorded against your account.">
    <div style={{
      minHeight: 'auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      padding: 0
    }}>
      <div style={{
        background: 'transparent',
        borderRadius: 0,
        padding: 0,
        width: '100%',
        maxWidth: 'none',
        boxShadow: 'none'
      }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#F0EBE3', fontWeight: 500 }}>
              Email
            </label>
            <input
              type="email"
              value="info@thebomacafe.co.za"
              disabled
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '12px',
                border: '2px solid #3A3428',
                background: '#221E17',
                fontSize: '1rem',
                color: '#A09888',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#F0EBE3', fontWeight: 500 }}>
              Name
            </label>
            {accounts.length > 0 ? (
              <select
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '2px solid #3A3428',
                  background: '#2A261E',
                  fontSize: '1rem',
                  color: '#F0EBE3',
                }}
                disabled={!accountsLoaded}
              >
                {accounts.map((a) => (
                  <option key={a.username} value={a.username}>
                    {a.display_name} — {ROLE_LABELS[a.role] || a.role}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={accountsLoaded ? 'Username (no accounts configured yet)' : 'Loading accounts…'}
                disabled={!accountsLoaded}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '2px solid #3A3428',
                  background: '#2A261E',
                  fontSize: '1rem',
                  color: '#F0EBE3',
                }}
              />
            )}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#F0EBE3', fontWeight: 500 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoFocus
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '12px',
                border: '2px solid #3A3428',
                background: '#2A261E',
                fontSize: '1rem',
                transition: 'all 0.3s ease'
              }}
              required
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(232,84,84,0.15)',
              color: '#E85454',
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
            disabled={isLoading || !accountsLoaded}
            className="btn btn-primary"
            style={{ width: '100%', opacity: isLoading || !accountsLoaded ? 0.7 : 1 }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <a href="/" style={{ color: '#A09888', fontSize: '0.9rem' }}>
            ← Back to Website
          </a>
        </div>
      </div>
    </div>
    </PremiumAuthShell>
  );
}

export default function AdminLogin() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1A1610 0%, #242018 100%)',
        color: '#F0EBE3',
        fontSize: '1.2rem'
      }}>
        Loading...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
