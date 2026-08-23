import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  isInitialized: boolean;
  user: { email: string } | null;
  login: (email: string) => void;
  signup: (email: string) => void;
  logout: () => void;
  setInitialized: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('autoops_auth') !== 'false');
  const [isInitialized, setIsInitialized] = useState(() => localStorage.getItem('autoops_init') !== 'false');
  const [user, setUser] = useState<{ email: string } | null>(() => {
    const stored = localStorage.getItem('autoops_user');
    return stored ? JSON.parse(stored) : { email: 'demo@autoops.ai' };
  });

  useEffect(() => {
    localStorage.setItem('autoops_auth', String(isAuthenticated));
    localStorage.setItem('autoops_init', String(isInitialized));
    if (user) localStorage.setItem('autoops_user', JSON.stringify(user));
    else localStorage.removeItem('autoops_user');
  }, [isAuthenticated, isInitialized, user]);

  const login = (email: string) => { setUser({ email }); setIsAuthenticated(true); setIsInitialized(false); };
  const signup = (email: string) => { setUser({ email }); setIsAuthenticated(true); setIsInitialized(false); };
  const logout = () => { setUser(null); setIsAuthenticated(false); setIsInitialized(false); localStorage.clear(); };
  const setInitialized = (val: boolean) => setIsInitialized(val);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isInitialized, user, login, signup, logout, setInitialized }}>
      {children}
    </AuthContext.Provider>
  );
};
