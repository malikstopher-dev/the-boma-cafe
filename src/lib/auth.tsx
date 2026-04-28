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

const USER_KEY = 'boma_admin_user';

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
        localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      } else {
        localStorage.removeItem(USER_KEY);
      }
    } catch {
      const userData = localStorage.getItem(USER_KEY);
      if (userData) {
        try {
          setUser(JSON.parse(userData));
          setIsAuthenticated(true);
        } catch {
          localStorage.removeItem(USER_KEY);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (password: string): Promise<boolean> => {
    try {
      console.log('Attempting login with password:', password);
      const result = await cmsService.login(password) as { success?: boolean; user?: any; error?: string };
      console.log('Login result:', result);
      // Check for success or handle error response from 401
      if (result.success && result.user) {
        console.log('Login successful');
        setUser(result.user);
        setIsAuthenticated(true);
        localStorage.setItem(USER_KEY, JSON.stringify(result.user));
        return true;
      }
      // Handle error response from failed login
      if (result.error) {
        console.error('Login failed:', result.error);
      }
      console.log('Login returning false');
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem(USER_KEY);
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