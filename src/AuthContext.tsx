import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Role } from './types';
import { clearAuthStorage, getStoredAuthSession, setStoredAuthSession, setAuthToken } from './api';
import { loginUser, logoutUser, registerUser } from './authService';

function mapApiRoleToInternal(role: string): Role {
  const normalized = role?.toLowerCase() ?? '';
  if (normalized === 'rotcofficer' || normalized === 'officer') return 'officer';
  if (normalized === 'admin') return 'admin';
  return 'cadet';
}

interface Session {
  username: string;
  role: Role;
  name: string;
  platoon?: string;
  cadetId?: number;
}

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  login: (username: string, password: string, role: Role) => Promise<boolean>;
  register: (username: string, password: string, role: Role) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeStoredRole(role: string | Role): Role {
  const normalized = String(role).toLowerCase();
  if (normalized === 'rotcofficer' || normalized === 'officer') return 'officer';
  if (normalized === 'admin') return 'admin';
  return 'cadet';
}

function normalizeStoredSession(session: Session | null): Session | null {
  if (!session) return null;
  return {
    ...session,
    role: normalizeStoredRole(session.role),
  };
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(() => normalizeStoredSession(getStoredAuthSession()));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuthStorage();
      setSession(null);
      navigate('/login', { replace: true });
    };

    window.addEventListener('rotc-auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('rotc-auth-unauthorized', handleUnauthorized);
  }, [navigate]);

  useEffect(() => {
    if (session) {
      setStoredAuthSession(session);
    }
  }, [session]);

  const login = async (username: string, password: string, role: Role) => {
    setLoading(true);
    try {
      const auth = await loginUser(username, password, role);
      if (auth?.token && auth.user) {

        setAuthToken(auth.token);
        const internalRole = mapApiRoleToInternal(auth.user.role);
        
        const nextSession: Session = {
          username: auth.user.username,
          role: internalRole,
          name: auth.user.name ?? auth.user.username,
          platoon: auth.user.platoon,
          cadetId: auth.cadet?.id ?? undefined,
        };

        setStoredAuthSession(nextSession);
        setSession(nextSession);
        navigate(internalRole === 'cadet' ? '/my-attendance' : '/dashboard', { replace: true });

        return true;
      }
      return false;
    } catch (err) {
      console.error('Login failed', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, password: string, role: Role) => {
    setLoading(true);
    try {
      const result = await registerUser(username, password, role);
      return result.success;
    } catch (err) {
      console.error('Register failed', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    try {
      clearAuthStorage();
      setSession(null);
      logoutUser().catch(() => {});
      navigate('/login', { replace: true });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AuthContext.Provider value={{ session, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
