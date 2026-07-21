import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { SocketProvider } from './context/SocketContext';
import { useAuthStore } from './store/authStore';
import { useUIStore } from './store/uiStore';
import { authService } from './services/index';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

import { lazy, Suspense } from 'react';

// Pages - Lazy Loaded
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const RoomPage = lazy(() => import('./pages/RoomPage'));
const CollaboratePage = lazy(() => import('./pages/CollaboratePage'));
const WhiteboardPage = lazy(() => import('./pages/WhiteboardPage'));
const EditorPage = lazy(() => import('./pages/EditorPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const InvitePage = lazy(() => import('./pages/InvitePage'));
const ReplayPage = lazy(() => import('./pages/ReplayPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'rgb(var(--surface-950))' }}>
    <div className="w-10 h-10 border-4 border-primary-600/30 border-t-primary-600 rounded-full animate-spin" />
  </div>
);

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function AppInitializer({ children }) {
  const { isAuthenticated, login, logout } = useAuthStore();
  const { theme } = useUIStore();

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  useEffect(() => {
    if (isAuthenticated) {
      authService.getMe().then((res) => {
        useAuthStore.getState().setUser(res.data.data.user);
      }).catch(() => {
        logout();
      });
    }
  }, []);

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInitializer>
        <SocketProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' },
              success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Guest routes */}
              <Route element={<GuestRoute><AuthLayout /></GuestRoute>}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              </Route>

              {/* Email verify (accessible always) */}
              <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
              <Route path="/invite/:token" element={<ProtectedRoute><InvitePage /></ProtectedRoute>} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/room/:slug" element={<RoomPage />} />
                <Route path="/room/:slug/collaborate" element={<CollaboratePage />} />
                <Route path="/room/:slug/whiteboard" element={<WhiteboardPage />} />
                <Route path="/room/:slug/editor" element={<EditorPage />} />
                <Route path="/room/:slug/replay/:sessionId" element={<ReplayPage />} />
              </Route>

              {/* Root redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </SocketProvider>
      </AppInitializer>
    </BrowserRouter>
  );
}
