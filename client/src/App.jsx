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

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import DashboardPage from './pages/DashboardPage';
import RoomPage from './pages/RoomPage';
import WhiteboardPage from './pages/WhiteboardPage';
import EditorPage from './pages/EditorPage';
import ProfilePage from './pages/ProfilePage';
import InvitePage from './pages/InvitePage';
import ReplayPage from './pages/ReplayPage';
import NotFoundPage from './pages/NotFoundPage';

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
              <Route path="/room/:slug/whiteboard" element={<WhiteboardPage />} />
              <Route path="/room/:slug/editor" element={<EditorPage />} />
              <Route path="/room/:slug/replay/:sessionId" element={<ReplayPage />} />
            </Route>

            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </SocketProvider>
      </AppInitializer>
    </BrowserRouter>
  );
}
