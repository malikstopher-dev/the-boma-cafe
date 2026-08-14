'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminPage from '@/components/admin/design-system/AdminPage';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/admin/design-system/Toast';

interface Account {
  id: string;
  username: string;
  display_name: string;
  email: string;
  role: string;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  full_manager: 'Full Manager',
  manager: 'Manager',
  assistant_manager: 'Assistant Manager',
};

const ROLE_COLORS: Record<string, string> = {
  owner: '#C8A04E',
  full_manager: '#7BC86B',
  manager: '#5BA8D9',
  assistant_manager: '#A88BD9',
};

export default function AdminAccountsPage() {
  const { can } = useAuth();
  const { success, error } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: '', display_name: '', role: 'manager', password: '' });

  const canWrite = can('accounts.write');
  const canDelete = can('accounts.delete');
  const canChangeRole = can('accounts.change_role');
  const canForceLogout = can('security.sessions');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/accounts');
      if (res.ok) {
        const json = await res.json();
        setAccounts(Array.isArray(json?.data) ? json.data : []);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      success('Account created');
      setShowCreate(false);
      setForm({ username: '', display_name: '', role: 'manager', password: '' });
      void load();
    } else {
      const json = await res.json().catch(() => ({}));
      error(json.error || 'Failed to create account');
    }
  };

  const updateAccount = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/accounts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      error(json.error || 'Update failed');
      return false;
    }
    void load();
    return true;
  };

  const resetPassword = async (id: string) => {
    const password = window.prompt('New password (min 6 characters):');
    if (!password) return;
    if (await updateAccount(id, { password })) {
      success('Password reset — user must change it on next login');
    }
  };

  const forceLogout = async (id: string) => {
    const res = await fetch(`/api/admin/accounts/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'force-logout' }),
    });
    if (res.ok) success('Sessions terminated');
    else error('Failed');
    void load();
  };

  const deleteAccount = async (id: string, name: string) => {
    if (!window.confirm(`Deactivate account for ${name}? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/accounts/${id}`, { method: 'DELETE' });
    if (res.ok) success('Account deactivated');
    else error('Failed to delete');
    if (res.ok) void load();
  };

  return (
    <AdminPage title="Admin Accounts" description="Management team identities — every action is attributed to the logged-in manager.">
      {canWrite && (
        <button
          className="btn btn-primary"
          onClick={() => setShowCreate((v) => !v)}
          style={{ marginBottom: '1.5rem' }}
        >
          {showCreate ? 'Cancel' : '+ Add Account'}
        </button>
      )}

      {showCreate && canWrite && (
        <form
          onSubmit={createAccount}
          style={{
            background: '#242018',
            border: '1px solid #3A3428',
            borderRadius: 16,
            padding: '1.5rem',
            marginBottom: '1.5rem',
            display: 'grid',
            gap: '1rem',
            maxWidth: 640,
          }}
        >
          <h3 style={{ color: '#F0EBE3', margin: 0 }}>New management account</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input placeholder="Display name (e.g. Chriselda)" value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })} required
              style={inputStyle} />
            <input placeholder="Username (e.g. chriselda)" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })} required
              style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={inputStyle}>
              <option value="full_manager">Full Manager</option>
              <option value="manager">Manager</option>
              <option value="assistant_manager">Assistant Manager</option>
            </select>
            <input type="password" placeholder="Initial password (min 6)" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} required
              style={inputStyle} />
          </div>
          <div>
            <button type="submit" className="btn btn-primary">Create Account</button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{ color: '#A09888' }}>Loading accounts…</p>
      ) : accounts.length === 0 ? (
        <p style={{ color: '#A09888' }}>No accounts found. Accounts are created here or via migration 079 seeds.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#242018', borderRadius: 16, overflow: 'hidden' }}>
            <thead>
              <tr style={{ color: '#A09888', textAlign: 'left', fontSize: 13 }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Username</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Last Login</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} style={{ borderTop: '1px solid #3A3428' }}>
                  <td style={tdStyle}>
                    <div style={{ color: '#F0EBE3', fontWeight: 600 }}>{a.display_name}</div>
                    <div style={{ color: '#A09888', fontSize: 12 }}>{a.email}</div>
                  </td>
                  <td style={tdStyle}><code style={{ color: '#C8A04E' }}>{a.username}</code></td>
                  <td style={tdStyle}>
                    <span style={{
                      color: ROLE_COLORS[a.role] || '#F0EBE3',
                      background: `${ROLE_COLORS[a.role] || '#F0EBE3'}1A`,
                      padding: '3px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                    }}>
                      {ROLE_LABELS[a.role] || a.role}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {a.is_active ? (
                      <span style={{ color: '#7BC86B' }}>Active</span>
                    ) : (
                      <span style={{ color: '#E85454' }}>Disabled</span>
                    )}
                    {a.must_change_password && (
                      <span style={{ color: '#C8A04E', marginLeft: 8, fontSize: 12 }}>· pw change</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ color: '#A09888' }}>
                      {a.last_login_at ? new Date(a.last_login_at).toLocaleString() : 'Never'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      {canWrite && (
                        <>
                          <button className="btn btn-sm" onClick={() => resetPassword(a.id)}>Reset PW</button>
                          <button className="btn btn-sm" onClick={() =>
                            updateAccount(a.id, { is_active: !a.is_active })
                          }>
                            {a.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </>
                      )}
                      {canForceLogout && (
                        <button className="btn btn-sm" onClick={() => forceLogout(a.id)}>Force Logout</button>
                      )}
                      {canChangeRole && a.role !== 'owner' && (
                        <select
                          value={a.role}
                          onChange={(e) => updateAccount(a.id, { role: e.target.value })}
                          style={{ ...inputStyle, width: 'auto', padding: '6px 10px' }}
                        >
                          <option value="full_manager">Full Manager</option>
                          <option value="manager">Manager</option>
                          <option value="assistant_manager">Assistant Manager</option>
                        </select>
                      )}
                      {canDelete && a.role !== 'owner' && (
                        <button className="btn btn-sm" style={{ color: '#E85454' }}
                          onClick={() => deleteAccount(a.id, a.display_name)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPage>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: 10,
  border: '1px solid #3A3428',
  background: '#2A261E',
  color: '#F0EBE3',
  fontSize: 14,
};

const thStyle: React.CSSProperties = { padding: '1rem 1.25rem', fontWeight: 600, whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '1rem 1.25rem', whiteSpace: 'nowrap' };