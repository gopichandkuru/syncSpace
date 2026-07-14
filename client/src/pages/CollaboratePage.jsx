import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useRoomStore } from '../store/roomStore';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { roomService } from '../services';
import WhiteboardPanel from '../features/whiteboard/WhiteboardPanel';
import EditorPanel from '../features/editor/EditorPanel';
import ChatPanel from '../features/chat/ChatPanel';
import {
  TbChevronLeft, TbUsers, TbMessage, TbLayoutColumns, TbBrush, TbCode,
  TbGripVertical, TbWifi, TbWifiOff,
} from 'react-icons/tb';
import toast from 'react-hot-toast';

export default function CollaboratePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { currentRoom, currentSession, setCurrentRoom, setCurrentSession, members } = useRoomStore();
  const { chatOpen, setChatOpen } = useUIStore();
  const { joinRoom, leaveRoom, isConnected } = useSocket();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [layout, setLayout] = useState('both'); // 'both' | 'whiteboard' | 'editor'
  const [dividerX, setDividerX] = useState(50); // percent
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef(null);
  const joinedRef = useRef(false); // prevent double-join

  // ── Step 1: Load room + create/find session ─────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch room if not already in store
        let room = currentRoom;
        if (!room || room.slug !== slug) {
          const res = await roomService.getBySlug(slug);
          room = res.data.data.room;
          if (!cancelled) setCurrentRoom(room);
        }

        // Create a session (idempotent — server returns existing or creates new)
        if (!currentSession) {
          try {
            const sRes = await roomService.createSession(room._id);
            if (!cancelled) setCurrentSession(sRes.data.data.session);
          } catch (sessionErr) {
            // Session may already exist — not a fatal error, continue
            console.warn('Session create warning (non-fatal):', sessionErr?.response?.data?.message);
          }
        }

      } catch (err) {
        console.error('CollaboratePage init error:', err);
        if (!cancelled) {
          setError(err?.response?.data?.message || 'Failed to load workspace.');
          toast.error('Failed to load workspace. Redirecting...');
          setTimeout(() => navigate('/dashboard'), 1500);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => { cancelled = true; };
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 2: Join socket room once room is ready AND socket is connected ──
  useEffect(() => {
    if (loading || !currentRoom || joinedRef.current) return;

    const doJoin = () => {
      if (joinedRef.current) return;
      joinedRef.current = true;
      joinRoom(currentRoom._id, currentSession?._id);
    };

    if (isConnected) {
      doJoin();
    } else {
      // Socket may not be connected yet — retry with a short delay
      const timer = setTimeout(doJoin, 1200);
      return () => clearTimeout(timer);
    }

    return () => {
      joinedRef.current = false;
      leaveRoom();
    };
  }, [currentRoom?._id, currentSession?._id, isConnected, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Draggable divider ────────────────────────────────────────────────────
  const handleDividerMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const pct = ((clientX - rect.left) / rect.width) * 100;
      setDividerX(Math.min(Math.max(pct, 25), 75));
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging]);

  // ── Loading screen ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-surface-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 border-4 border-primary-600/30 border-t-primary-600 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <TbBrush size={20} className="text-primary-500" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-white font-medium text-sm">Loading collaboration space…</p>
            <p className="text-surface-400 text-xs mt-1">Connecting to workspace</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-surface-950">
        <div className="text-center space-y-3">
          <p className="text-red-400 font-medium">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="text-primary-400 text-sm hover:underline">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const onlineCount = members.filter((m) => m.isOnline !== false).length || members.length;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-surface-950 overflow-hidden">
      {/* ── Top Bar ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 h-11 bg-surface-900 border-b border-surface-800 px-3 flex items-center gap-3">
        <Link
          to={`/room/${slug}`}
          className="p-1.5 hover:bg-surface-800 rounded-lg text-surface-450 hover:text-white transition-colors flex-shrink-0"
          title="Back to workspace"
        >
          <TbChevronLeft size={18} />
        </Link>

        <span className="font-semibold text-sm truncate max-w-[200px]" style={{ color: 'rgb(var(--text-base))' }}>
          {currentRoom?.name}
        </span>

        {/* Connection indicator */}
        <div className="flex items-center gap-1" title={isConnected ? 'Connected' : 'Connecting...'}>
          {isConnected
            ? <TbWifi size={14} className="text-green-400" />
            : <TbWifiOff size={14} className="text-yellow-400 animate-pulse" />
          }
          <span className={`text-[10px] font-medium ${isConnected ? 'text-green-400' : 'text-yellow-400'}`}>
            {isConnected ? 'Live' : 'Connecting'}
          </span>
        </div>

        {/* Layout toggles */}
        <div className="flex items-center gap-0.5 bg-surface-800 rounded-lg p-0.5 border border-surface-700 ml-2">
          <button
            onClick={() => setLayout('whiteboard')}
            title="Whiteboard only"
            className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${layout === 'whiteboard' ? 'bg-primary-600 text-white' : 'text-surface-400 hover:text-white'}`}
          >
            <TbBrush size={14} />
          </button>
          <button
            onClick={() => setLayout('both')}
            title="Split screen"
            className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${layout === 'both' ? 'bg-primary-600 text-white' : 'text-surface-400 hover:text-white'}`}
          >
            <TbLayoutColumns size={14} />
          </button>
          <button
            onClick={() => setLayout('editor')}
            title="Editor only"
            className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${layout === 'editor' ? 'bg-primary-600 text-white' : 'text-surface-400 hover:text-white'}`}
          >
            <TbCode size={14} />
          </button>
        </div>

        {/* Online members */}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-surface-400">
            <TbUsers size={14} />
            <span>{onlineCount} online</span>
          </div>
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((m) => {
              const u = m.user || m;
              return (
                <div
                  key={u._id || u.id || Math.random()}
                  title={u.name}
                  className="w-7 h-7 rounded-full bg-primary-800 border-2 border-surface-900 flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                >
                  {u.avatar ? <img src={u.avatar} alt={u.name} className="w-full h-full rounded-full object-cover" /> : u.name?.charAt(0)?.toUpperCase()}
                </div>
              );
            })}
            {members.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-surface-700 border-2 border-surface-900 flex items-center justify-center text-xs text-surface-300 font-bold">
                +{members.length - 5}
              </div>
            )}
          </div>

          <button
            onClick={() => setChatOpen(!chatOpen)}
            title="Toggle Chat"
            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs ${chatOpen ? 'bg-primary-600 text-white' : 'bg-surface-800 text-surface-400 hover:text-white hover:bg-surface-700'}`}
          >
            <TbMessage size={14} />
            <span className="hidden md:inline">Chat</span>
          </button>
        </div>
      </div>

      {/* ── Main Area ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden" ref={containerRef}>
        {/* Whiteboard Panel */}
        {(layout === 'both' || layout === 'whiteboard') && (
          <div
            className="flex-shrink-0 overflow-hidden"
            style={{ width: layout === 'both' ? `${dividerX}%` : '100%' }}
          >
            <WhiteboardPanel />
          </div>
        )}

        {/* Draggable Divider */}
        {layout === 'both' && (
          <div
            onMouseDown={handleDividerMouseDown}
            onTouchStart={handleDividerMouseDown}
            className={`flex-shrink-0 w-1.5 relative group cursor-col-resize hover:bg-primary-500/60 transition-colors ${dragging ? 'bg-primary-500/80' : 'bg-surface-800'}`}
          >
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4 flex items-center justify-center">
              <TbGripVertical size={16} className="text-surface-600 group-hover:text-primary-400 transition-colors" />
            </div>
          </div>
        )}

        {/* Editor Panel */}
        {(layout === 'both' || layout === 'editor') && (
          <div
            className="flex-1 overflow-hidden border-l border-surface-800"
            style={{ width: layout === 'both' ? `${100 - dividerX}%` : '100%' }}
          >
            <EditorPanel />
          </div>
        )}

        {/* Chat Sidebar */}
        {chatOpen && (
          <div className="flex-shrink-0 w-72 border-l border-surface-800 animate-slide-right">
            <ChatPanel />
          </div>
        )}
      </div>
    </div>
  );
}
