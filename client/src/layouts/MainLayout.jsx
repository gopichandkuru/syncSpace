import { Outlet } from 'react-router-dom';
import Sidebar from '../components/sidebar/Sidebar';
import TopBar from '../components/TopBar';

export default function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'rgb(var(--surface-950))', color: 'rgb(var(--text-base))' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 transition-all duration-300">
        <TopBar />
        <main className="flex-1 overflow-auto" style={{ backgroundColor: 'rgb(var(--surface-950))' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
