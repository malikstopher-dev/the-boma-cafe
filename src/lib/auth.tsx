'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

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

const ADMIN_PASSWORD = 'Lovers0884';
const AUTH_KEY = 'boma_admin_auth';
const USER_KEY = 'boma_admin_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }
    
    const auth = localStorage.getItem(AUTH_KEY);
    const userData = localStorage.getItem(USER_KEY);
    
    if (auth === 'true' && userData) {
      try {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
  };

  const login = async (password: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (password === ADMIN_PASSWORD) {
          const adminUser: AdminUser = {
            id: '1',
            username: 'admin',
            email: 'admin@thebomacafe.co.za'
          };
          
          localStorage.setItem(AUTH_KEY, 'true');
          localStorage.setItem(USER_KEY, JSON.stringify(adminUser));
          
          setUser(adminUser);
          setIsAuthenticated(true);
          resolve(true);
        } else {
          resolve(false);
        }
      }, 500);
    });
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
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