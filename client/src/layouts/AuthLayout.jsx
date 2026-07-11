import { Outlet, Link } from 'react-router-dom';
import { TbBrandReact } from 'react-icons/tb';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'rgb(var(--surface-950))', color: 'rgb(var(--text-base))' }}>
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[480px] p-12"
        style={{
          background: 'linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgb(var(--surface-900)) 60%, rgb(var(--surface-950)) 100%)',
          borderRight: '1px solid rgb(var(--surface-800))',
        }}
      >
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <TbBrandReact className="text-white text-xl" />
          </div>
          <span className="text-2xl font-bold" style={{ color: 'rgb(var(--text-base))' }}>SyncSpace</span>
        </Link>

        <div>
          <h2 className="text-4xl font-bold leading-tight mb-6" style={{ color: 'rgb(var(--text-base))' }}>
            Collaborate in<br />
            <span className="text-gradient">Real-Time</span>
          </h2>
          <p className="text-lg leading-relaxed mb-8" style={{ color: 'rgb(var(--text-muted))' }}>
            Draw, code, and create together. SyncSpace brings your team into one shared canvas and editor — live.
          </p>

          <div className="space-y-4">
            {[
              { icon: '🎨', title: 'Collaborative Whiteboard', desc: 'Draw and sketch with your team simultaneously' },
              { icon: '💻', title: 'Live Code Editor',         desc: 'Write code together with Monaco Editor + Yjs CRDT' },
              { icon: '⚡', title: 'Real-Time Sync',           desc: 'Zero-latency sync powered by Socket.io + Yjs' },
            ].map((f) => (
              <div
                key={f.title}
                className="flex gap-4 p-4 rounded-xl"
                style={{
                  backgroundColor: 'rgb(var(--surface-800) / 0.5)',
                  border: '1px solid rgb(var(--surface-700) / 0.5)',
                }}
              >
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'rgb(var(--text-base))' }}>{f.title}</p>
                  <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>
          © 2026 SyncSpace. Built for teams that create together.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <TbBrandReact className="text-white" />
            </div>
            <span className="text-xl font-bold" style={{ color: 'rgb(var(--text-base))' }}>SyncSpace</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
