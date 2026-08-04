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
  userId?: number;
  platoon?: string;
  cadetId?: number;
}

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  login: (username: string, password: string, role: Role) => Promise<{ success: boolean; message?: string }>;
  register: (
    username: string,
    password: string,
    role: Role,
    cadetFields?: { studentNumber: string; fullName: string; course: string; yearLevel: string },
  ) => Promise<{ success: boolean; message?: string; qrCodeId?: string }>;
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
        const internalRole = mapApiRoleToInternal(auth.user.role);
        const nextSession: Session = {
          username: auth.user.username,
          role: internalRole,
          name: auth.user.name ?? auth.user.username,
          userId: auth.user.id,
          platoon: auth.user.platoon,
          cadetId: auth.cadet?.id ?? undefined,
        };

        setAuthToken(auth.token);
        setStoredAuthSession(nextSession);
        setSession(nextSession);
        navigate(internalRole === 'cadet' ? '/my-attendance' : '/dashboard', { replace: true });
        return { success: true };
      }

      return { success: false, message: 'Login response was not valid.' };
    } catch (err) {
      console.error('Login failed', err);
      if (err instanceof Error) {
        return { success: false, message: err.message };
      }
      return { success: false, message: 'Unable to authenticate.' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    username: string,
    password: string,
    role: Role,
    cadetFields?: { studentNumber: string; fullName: string; course: string; yearLevel: string },
  ) => {
    setLoading(true);

    try {
      const result = await registerUser(username, password, role, cadetFields);
      return {
        success: true,
        message: result.message ?? 'Registration successful.',
        qrCodeId: result.qrCodeId ?? result.cadet?.qrCodeId,
      };
    } catch (err) {
      console.error('Register failed', err);
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Registration failed. Please try again.',
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearAuthStorage();
    setSession(null);
    void logoutUser().catch((err) => {
      console.error('Logout request failed', err);
    });
    navigate('/login', { replace: true });
  };

  return (
    <AuthContext.Provider value={{ session, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
