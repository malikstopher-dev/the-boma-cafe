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
    // Clear local state before redirect
    localStorage.removeItem('boma_staff_user');
    sessionStorage.clear();
    // Full page redirect to logout endpoint to ensure HttpOnly cookies are cleared
    window.location.href = '/api/admin/auth?action=logout';
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