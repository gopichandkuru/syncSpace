import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useRoomStore } from '../../store/roomStore';
import { authService } from '../../services';
import { TbBrandReact, TbLayoutDashboard, TbUser, TbLogout, TbMenu2 } from 'react-icons/tb';
import toast from 'react-hot-toast';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { currentRoom } = useRoomStore();

  const handleLogout = async () => {
    try {
      await authService.logout();
      logout();
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (err) {
      toast.error('Failed to log out');
    }
  };

  const navItems = [
    { label: 'Dashboard', icon: <TbLayoutDashboard size={20} />, path: '/dashboard' },
    { label: 'Profile',   icon: <TbUser size={20} />,            path: '/profile'   },
  ];

  return (
    <div
      className={`sidebar flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}
      style={{
        backgroundColor: 'rgb(var(--surface-900))',
        borderRight: '1px solid rgb(var(--surface-800))',
      }}
    >
      {/* Logo */}
      <div
        className="h-16 flex items-center justify-between px-4"
        style={{ borderBottom: '1px solid rgb(var(--surface-800))' }}
      >
        <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <TbBrandReact className="text-white text-xl animate-spin-slow" />
          </div>
          {sidebarOpen && (
            <span className="text-xl font-bold whitespace-nowrap" style={{ color: 'rgb(var(--text-base))' }}>
              SyncSpace
            </span>
          )}
        </Link>
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-primary-600/10 focus:outline-none transition-colors"
          style={{ color: 'rgb(var(--text-muted))' }}
        >
          <TbMenu2 size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border"
              style={
                isActive
                  ? {
                      backgroundColor: 'var(--sidebar-active-bg, rgba(99,102,241,0.1))',
                      color: 'var(--sidebar-active-text, #818cf8)',
                      borderColor: 'var(--sidebar-active-border, rgba(99,102,241,0.2))',
                    }
                  : {
                      color: 'rgb(var(--text-muted))',
                      borderColor: 'transparent',
                    }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--surface-800))';
                  e.currentTarget.style.color = 'rgb(var(--text-base))';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'rgb(var(--text-muted))';
                }
              }}
            >
              {item.icon}
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      {sidebarOpen && user && (
        <div className="p-4" style={{ borderTop: '1px solid rgb(var(--surface-800))' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary-800 flex items-center justify-center text-white font-bold border border-primary-700/50 flex-shrink-0">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'rgb(var(--text-base))' }}>
                {user.name}
              </p>
              <p className="text-xs truncate" style={{ color: 'rgb(var(--text-muted))' }}>
                {user.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="p-3 space-y-1" style={{ borderTop: '1px solid rgb(var(--surface-800))' }}>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent transition-colors focus:outline-none"
        >
          <TbLogout size={20} />
          {sidebarOpen && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );
}
