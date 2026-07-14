import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useRoomStore } from '../store/roomStore';
import { useUIStore } from '../store/uiStore';
import { roomService } from '../services';
import WhiteboardPanel from '../features/whiteboard/WhiteboardPanel';
import ChatPanel from '../features/chat/ChatPanel';
import { TbChevronLeft, TbMessage, TbCircleFilled } from 'react-icons/tb';
import toast from 'react-hot-toast';

export default function WhiteboardPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { currentRoom, currentSession, setCurrentRoom, setCurrentSession } = useRoomStore();
  const { chatOpen, setChatOpen } = useUIStore();
  const { joinRoom, leaveRoom, isConnected } = useSocket();
  const [loading, setLoading] = useState(!currentRoom);

  useEffect(() => {
    const init = async () => {
      try {
        if (!currentRoom) {
          const res = await roomService.getBySlug(slug);
          setCurrentRoom(res.data.data.room);
        }
        const room = currentRoom || (await roomService.getBySlug(slug)).data.data.room;
        if (!currentSession) {
          const sRes = await roomService.createSession(room._id);
          setCurrentSession(sRes.data.data.session);
        }
      } catch (err) {
        toast.error('Failed to load workspace.');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [slug]);

  useEffect(() => {
    if (!currentRoom || loading) return;
    joinRoom(currentRoom._id, currentSession?._id);
    return () => {
      leaveRoom();
    };
  }, [currentRoom?._id, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-surface-400 text-sm">Loading whiteboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-surface-950 overflow-hidden">
      {/* Top Bar */}
      <div className="flex-shrink-0 h-11 bg-surface-900 border-b border-surface-800 px-3 flex items-center gap-3">
        <Link to={`/room/${slug}`} className="p-1.5 hover:bg-surface-800 rounded-lg text-surface-450 hover:text-white transition-colors flex-shrink-0">
          <TbChevronLeft size={18} />
        </Link>
        <span className="font-semibold text-sm truncate" style={{ color: 'rgb(var(--text-base))' }}>
          {currentRoom?.name} — Whiteboard
        </span>
        <TbCircleFilled size={8} className={isConnected ? 'text-green-400' : 'text-red-400'} />
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`ml-auto p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs ${chatOpen ? 'bg-primary-600 text-white' : 'bg-surface-800 text-surface-400 hover:text-white hover:bg-surface-700'}`}
        >
          <TbMessage size={14} />
          <span>Chat</span>
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <WhiteboardPanel height={window.innerHeight - 64 - 44} />
        </div>
        {chatOpen && (
          <div className="flex-shrink-0 w-72 border-l border-surface-800 animate-slide-right">
            <ChatPanel />
          </div>
        )}
      </div>
    </div>
  );
}
