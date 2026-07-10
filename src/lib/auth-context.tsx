'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { cmsService } from './client-cms';

interface AdminUser {
  id: string;
  username: string;
  email: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AdminUser | null;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }
    
    try {
      const result = await cmsService.verifyAuth();
      if (result.authenticated && result.user) {
        setUser(result.user);
        setIsAuthenticated(true);
      }
    } catch {
      // Server is the sole authority
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (password: string): Promise<boolean> => {
    try {
      const result = await cmsService.login(password) as { success?: boolean; user?: any; error?: string };
      if (result.success && result.user) {
        setUser(result.user);
        setIsAuthenticated(true);
        return true;
      }
      if (result.error) {
        console.error('Login failed:', result.error);
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {
      // Server cookie clearing is best-effort; state is cleared regardless
    }
    // Nuclear clear: wipe all cookies and storage client-side
    const cookies = ['boma_admin_auth', 'boma_kitchen_auth', 'boma_waiter_auth', 'boma_bar_auth'];
    cookies.forEach(c => { document.cookie = `${c}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;`; });
    localStorage.removeItem('boma_staff_user');
    sessionStorage.clear();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}