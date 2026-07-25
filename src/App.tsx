import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import Layout from './components/Layout';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from './AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Cadets from './pages/Cadets';
import Reports from './pages/Reports';
import Profile from './pages/Profile';

const TAB_BY_PATH: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/attendance': 'attendance',
  '/cadets': 'cadets',
  '/reports': 'reports',
  '/profile': 'profile',
  '/my-attendance': 'my-attendance',
};

const PATH_BY_TAB: Record<string, string> = {
  dashboard: '/dashboard',
  attendance: '/attendance',
  cadets: '/cadets',
  reports: '/reports',
  profile: '/profile',
  'my-attendance': '/my-attendance',
};

function defaultRoute(role?: string) {
  return role === 'cadet' ? '/my-attendance' : '/dashboard';
}

function Shell({ children }: { children: React.ReactNode }) {
  const { session, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const currentTab = useMemo(
    () => TAB_BY_PATH[location.pathname] ?? defaultRoute(session?.role),
    [location.pathname, session?.role],
  );

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout
      username={session.username}
      role={session.role}
      currentTab={currentTab}
      setCurrentTab={(tab) => navigate(PATH_BY_TAB[tab] ?? defaultRoute(session.role))}
      onLogout={logout}
    >
      {children}
    </Layout>
  );
}

export default function App() {
  const { session } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to={defaultRoute(session.role)} replace /> : <Login />}
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin', 'officer']}>
            <Shell>
              <Dashboard />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/attendance"
        element={
          <ProtectedRoute allowedRoles={['admin', 'officer']}>
            <Shell>
              <Attendance />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/cadets"
        element={
          <ProtectedRoute allowedRoles={['admin', 'officer']}>
            <Shell>
              <Cadets />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={['admin', 'officer']}>
            <Shell>
              <Reports />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={['admin', 'officer']}>
            <Shell>
              <Profile />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-attendance"
        element={
          <ProtectedRoute allowedRoles={['cadet']}>
            <Shell>
              <Profile />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to={session ? defaultRoute(session.role) : '/login'} replace />} />
      <Route path="*" element={<Navigate to={session ? defaultRoute(session.role) : '/login'} replace />} />
    </Routes>
  );
}