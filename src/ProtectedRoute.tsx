import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { Role } from './types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { session } = useAuth();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles &&! allowedRoles.includes(session.role.toLowerCase() as Role))
  {
    return <Navigate to={session.role === 'cadet' ? '/my-attendance' : '/dashboard'} replace />;
  }

  return <>{children}</>;
}
