import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserRole } from '../types';

interface User {
  username: string;
  role: UserRole;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string, role: UserRole) => { success: boolean; error?: string };
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('dispatch_portal_user');
    if (saved) {
      try {
        const value = JSON.parse(saved);
        return { ...value, role: 'client', name: 'Demo Client' };
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('dispatch_portal_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('dispatch_portal_user');
    }
  }, [user]);

  const login = (usernameInput: string, passwordInput: string, role: UserRole) => {
    const trimmedUser = usernameInput.trim();
    const trimmedPass = passwordInput.trim();

    // Required by user prompt: login as "login" and password as "password"
    if (trimmedUser === 'login' && trimmedPass === 'password') {
      const newUser: User = {
        username: 'login',
        role,
        name: role === 'client' ? 'Demo Client' : 'Shop dashboard',
      };
      setUser(newUser);
      return { success: true };
    }

    // Also accept demo shortcuts for flexibility
    if ((trimmedUser === 'client' || trimmedUser === 'business' || trimmedUser === 'admin') && trimmedPass === 'password') {
      const detectedRole: UserRole = trimmedUser === 'business' ? 'business' : 'client';
      const newUser: User = {
        username: trimmedUser,
        role: detectedRole,
        name: detectedRole === 'client' ? 'Demo Client' : 'Shop dashboard',
      };
      setUser(newUser);
      return { success: true };
    }

    return {
      success: false,
      error: 'Invalid credentials. Please use username "login" and password "password".',
    };
  };

  const logout = () => {
    setUser(null);
  };

  const switchRole = (newRole: UserRole) => {
    if (user) {
      setUser({
        ...user,
        role: newRole,
        name: newRole === 'client' ? 'Demo Client' : 'Shop dashboard',
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
