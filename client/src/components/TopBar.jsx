import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { useNotificationStore } from '../store/notificationStore';
import { TbSun, TbMoon, TbBell, TbChevronRight, TbMenu2 } from 'react-icons/tb';
import { Link, useLocation } from 'react-router-dom';

export default function TopBar() {
  const { user } = useAuthStore();
  const { theme, toggleTheme, notificationsOpen, setNotificationsOpen, toggleSidebar } = useUIStore();
  const { unreadCount, notifications, markAllRead } = useNotificationStore();
  const location = useLocation();

  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    return (
      <div className="flex items-center gap-1.5 text-sm" style={{ color: 'rgb(var(--text-muted))' }}>
        <Link to="/dashboard" className="hover:opacity-100 transition-opacity" style={{ color: 'rgb(var(--text-muted))' }}>
          SyncSpace
        </Link>
        {paths.map((path, idx) => {
          const isLast = idx === paths.length - 1;
          const label = path.charAt(0).toUpperCase() + path.slice(1);
          return (
            <span key={path} className="flex items-center gap-1.5">
              <TbChevronRight size={14} />
              <span
                className={isLast ? 'font-semibold' : ''}
                style={{ color: isLast ? 'rgb(var(--text-base))' : 'rgb(var(--text-muted))' }}
              >
                {label.length > 20 ? label.slice(0, 20) + '...' : label}
              </span>
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <header
      className="h-auto min-h-[4rem] py-2 px-4 md:px-6 flex flex-col sm:flex-row sm:items-center justify-between z-30 backdrop-blur-md gap-3 sm:gap-0"
      style={{
        backgroundColor: 'rgb(var(--surface-900) / 0.8)',
        borderBottom: '1px solid rgb(var(--surface-800))',
        color: 'rgb(var(--text-base))',
      }}
    >
      <div>
        {/* Mobile menu toggle */}
        <div className="flex items-center gap-2 md:hidden mb-2 sm:mb-0">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors focus:outline-none"
          >
            <TbMenu2 size={22} />
          </button>
        </div>
        {getBreadcrumbs()}
      </div>

      <div className="flex items-center justify-end sm:justify-start gap-3 sm:gap-4 w-full sm:w-auto">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-lg transition-colors focus:outline-none"
          style={{ color: 'rgb(var(--text-muted))' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgb(var(--surface-800))';
            e.currentTarget.style.color = 'rgb(var(--text-base))';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'rgb(var(--text-muted))';
          }}
        >
          {theme === 'dark' ? <TbSun size={20} /> : <TbMoon size={20} />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-lg transition-colors relative focus:outline-none"
            style={{ color: 'rgb(var(--text-muted))' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(var(--surface-800))';
              e.currentTarget.style.color = 'rgb(var(--text-base))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgb(var(--text-muted))';
            }}
          >
            <TbBell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-indigo-600 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              className="absolute right-0 mt-2 w-80 rounded-xl shadow-2xl z-50 overflow-hidden animate-slide-up"
              style={{
                backgroundColor: 'rgb(var(--surface-900))',
                border: '1px solid rgb(var(--surface-800))',
              }}
            >
              <div
                className="p-4 flex items-center justify-between"
                style={{ borderBottom: '1px solid rgb(var(--surface-800))' }}
              >
                <span className="font-semibold" style={{ color: 'rgb(var(--text-base))' }}>
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-primary-400 hover:text-primary-300 font-medium focus:outline-none"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-sm" style={{ color: 'rgb(var(--text-muted))' }}>
                    No new notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-4 text-sm transition-colors ${n.read ? 'opacity-65' : ''}`}
                      style={{
                        backgroundColor: n.read ? 'transparent' : 'rgb(var(--surface-800) / 0.3)',
                        borderBottom: '1px solid rgb(var(--surface-800) / 0.4)',
                      }}
                    >
                      <p className="font-medium" style={{ color: 'rgb(var(--text-base))' }}>{n.message}</p>
                      <span className="text-[10px]" style={{ color: 'rgb(var(--text-muted))' }}>
                        {new Date(n.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        {user && (
          <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-white text-sm font-semibold border border-primary-600/50 flex-shrink-0">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
        )}
      </div>
    </header>
  );
}
