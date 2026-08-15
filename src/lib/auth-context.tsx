'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { cmsService } from './client-cms';
import { can as canPermission, roleLabel as roleLabelFor, type AdminPermission } from '@/lib/admin/permissions';

interface AdminUser {
  id: string;
  username: string;
  display_name: string;
  role: string;
  email: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AdminUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  can: (permission: AdminPermission) => boolean;
  roleLabel: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_ROLES = ['owner', 'full_manager', 'manager', 'assistant_manager'];

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

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const result = await cmsService.login(username, password) as { success?: boolean; user?: any; error?: string };
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
    // Admin-area logout lands on the admin login (never the staff login).
    window.location.href = '/api/admin/auth?action=logout&redirect=/admin/login';
  };

  const can = (permission: AdminPermission): boolean => {
    const role = user?.role;
    if (!role || !ADMIN_ROLES.includes(role)) return false;
    return canPermission(role as any, permission);
  };

  const roleLabel = (): string => {
    const role = user?.role;
    if (role && ADMIN_ROLES.includes(role)) return roleLabelFor(role as any);
    return 'Admin';
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading, can, roleLabel }}>
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