"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('Auth context: Checking session...');
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
        });
        console.log('Auth context: Session response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Auth context: Session data:', data);
          if (data.user) {
            console.log('Auth context: Setting user:', data.user);
            setUser(data.user);
          }
        } else {
          const error = await response.json();
          console.log('Auth context: Session check failed:', error);
        }
      } catch (error) {
        console.error('Auth context: Failed to check session:', error);
      }
    };
    
    checkSession();
  }, []);

  const login = (user: User) => {
    setUser(user);
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return { user: null, login: () => {}, logout: () => {} };
  }
  return context;
}