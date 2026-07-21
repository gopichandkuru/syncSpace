import { useEffect, useRef, useState, Component } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useRoomStore } from '../store/roomStore';
import { useUIStore } from '../store/uiStore';
import { roomService } from '../services';
import WhiteboardPanel from '../features/whiteboard/WhiteboardPanel';
import EditorPanel from '../features/editor/EditorPanel';
import ChatPanel from '../features/chat/ChatPanel';
import DocumentPanel from '../features/documents/DocumentPanel';
import MeetingManager from '../features/meeting/MeetingManager';
import MeetingOverlay from '../features/meeting/MeetingOverlay';
import ScreenShareViewer from '../features/meeting/ScreenShareViewer';
import { useMeetingStore } from '../store/meetingStore';
import {
  TbChevronLeft, TbUsers, TbMessage, TbLayoutColumns, TbBrush, TbCode,
  TbGripVertical, TbWifi, TbWifiOff, TbVideoPlus, TbPhoneOff, TbScreenShare, TbScreenShareOff
} from 'react-icons/tb';
import toast from 'react-hot-toast';

// ── Inline Error Boundary to isolate new features from crashing the page ──
class FeatureBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error('[FeatureBoundary] Caught error in', this.props.name, ':', error, info);
  }
  render() {
    if (this.state.hasError) {
      return null; // Silently hide the broken feature without killing the whole page
    }
    return this.props.children;
  }
}

export default function CollaboratePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { currentRoom, currentSession, setCurrentRoom, setCurrentSession, setMembers, members } = useRoomStore();
  const { chatOpen, setChatOpen } = useUIStore();
  const { socket, joinRoom, leaveRoom, isConnected, emitMeetingJoin, emitMeetingLeave, emitScreenShareStart, emitScreenShareStop } = useSocket();
  const { isInMeeting, isScreenSharing, setMeetingState, clearMeeting, meetingParticipants } = useMeetingStore();
  const [searchParams] = useSearchParams();
  const docId = searchParams.get('doc');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [layout, setLayout] = useState('both'); // 'both' | 'whiteboard' | 'editor'
  const [dividerX, setDividerX] = useState(50); // percent
  const [dragging, setDragging] = useState(false);
  const [activities, setActivities] = useState({}); // { userId: 'activity_string' }
  const containerRef = useRef(null);
  const joinedRef = useRef(false); // prevent double-join

  // ── Step 1: Load room + create/find session ─────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch room if not already in store (always fetch to ensure members are populated)
        let room = currentRoom;
        if (!room || room.slug !== slug) {
          const res = await roomService.getBySlug(slug);
          room = res.data.data.room;
          if (!cancelled) {
            setCurrentRoom(room);
            setMembers(room.members || []);
          }
        } else if (!members || members.length === 0) {
          try {
            const res = await roomService.getBySlug(slug);
            room = res.data.data.room;
            if (!cancelled) setMembers(room.members || []);
          } catch (_) { /* non-fatal */ }
        }

        // Create a session (idempotent — server returns existing or creates new)
        if (!currentSession) {
          try {
            const sRes = await roomService.createSession(room._id);
            if (!cancelled) setCurrentSession(sRes.data.data.session);
          } catch (sessionErr) {
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
      const isMobile = window.innerWidth < 768;

      if (isMobile) {
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const pct = ((clientY - rect.top) / rect.height) * 100;
        setDividerX(Math.min(Math.max(pct, 20), 80));
      } else {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const pct = ((clientX - rect.left) / rect.width) * 100;
        setDividerX(Math.min(Math.max(pct, 20), 80));
      }
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

  // ── Activity tracking ────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    
    const handleActivity = ({ userId, activity }) => {
      setActivities(prev => ({ ...prev, [userId]: activity }));
      if (['editing_doc', 'drawing', 'typing_code'].includes(activity)) {
        setTimeout(() => {
          setActivities(prev => {
            if (prev[userId] === activity) {
              const newAct = { ...prev };
              delete newAct[userId];
              return newAct;
            }
            return prev;
          });
        }, 5000);
      }
    };
    
    const handleMeetingJoin = ({ userId }) => setActivities(prev => ({ ...prev, [userId]: 'in_meeting' }));
    const handleMeetingLeave = ({ userId }) => setActivities(prev => { const n = {...prev}; delete n[userId]; return n; });
    const handleScreenShareStart = ({ userId }) => setActivities(prev => ({ ...prev, [userId]: 'sharing_screen' }));
    const handleScreenShareStop = ({ userId }) => setActivities(prev => ({ ...prev, [userId]: 'in_meeting' }));

    socket.on('user:activity_change', handleActivity);
    socket.on('meeting:join', handleMeetingJoin);
    socket.on('meeting:leave', handleMeetingLeave);
    socket.on('screen_share:start', handleScreenShareStart);
    socket.on('screen_share:stop', handleScreenShareStop);

    return () => {
      socket.off('user:activity_change', handleActivity);
      socket.off('meeting:join', handleMeetingJoin);
      socket.off('meeting:leave', handleMeetingLeave);
      socket.off('screen_share:start', handleScreenShareStart);
      socket.off('screen_share:stop', handleScreenShareStop);
    };
  }, [socket]);

  // ── Meeting & Screen Share Actions ───────────────────────────────────────
  const handleToggleMeeting = async () => {
    if (isInMeeting) {
      emitMeetingLeave(currentRoom?._id);
      clearMeeting();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setMeetingState({ isInMeeting: true, localStream: stream });
        emitMeetingJoin(currentRoom?._id);
      } catch (err) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          setMeetingState({ isInMeeting: true, localStream: audioStream, videoEnabled: false });
          emitMeetingJoin(currentRoom?._id);
        } catch (err2) {
          try {
            const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            setMeetingState({ isInMeeting: true, localStream: videoStream, audioEnabled: false });
            emitMeetingJoin(currentRoom?._id);
          } catch (err3) {
            setMeetingState({ isInMeeting: true, localStream: null, audioEnabled: false, videoEnabled: false });
            emitMeetingJoin(currentRoom?._id);
            toast.info('Joined as viewer (No camera/mic access).');
          }
        }
      }
    }
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      const { localScreenStream } = useMeetingStore.getState();
      localScreenStream?.getTracks().forEach(track => track.stop());
      setMeetingState({ isScreenSharing: false, localScreenStream: null });
      emitScreenShareStop(currentRoom?._id);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setMeetingState({ isScreenSharing: true, localScreenStream: stream });
        emitScreenShareStart(currentRoom?._id);
        stream.getVideoTracks()[0].onended = () => {
          setMeetingState({ isScreenSharing: false, localScreenStream: null });
          emitScreenShareStop(currentRoom?._id);
        };
      } catch (err) {
        toast.error('Screen sharing cancelled.');
      }
    }
  };

  // ── Loading screen ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-950">
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
      <div className="flex items-center justify-center h-screen bg-surface-950">
        <div className="text-center space-y-3">
          <p className="text-red-400 font-medium">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="text-primary-400 text-sm hover:underline">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const safeMembers = members ?? [];
  const onlineCount = safeMembers.filter((m) => m.isOnline !== false).length || safeMembers.length;

  return (
    <div className="flex flex-col h-screen bg-surface-950 overflow-hidden">
      {/* ── Top Bar ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 h-11 bg-surface-900 border-b border-surface-800 px-3 flex items-center gap-3">
        <Link
          to={`/room/${slug}`}
          className="p-1.5 hover:bg-surface-800 rounded-lg text-surface-450 hover:text-white transition-colors flex-shrink-0"
          title="Back to workspace"
        >
          <TbChevronLeft size={18} />
        </Link>

        <span className="font-semibold text-sm truncate max-w-[100px] sm:max-w-[200px]" style={{ color: 'rgb(var(--text-base))' }}>
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
        <div className="flex items-center gap-0.5 bg-surface-800 rounded-lg p-0.5 border border-surface-700 ml-auto md:ml-2">
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

        {/* Meeting & Screen Share */}
        <div className="flex items-center gap-1 ml-2 pl-2 border-l border-surface-700">
          <button
            onClick={handleToggleMeeting}
            className={`px-2 py-1.5 rounded text-xs flex items-center gap-1.5 font-medium transition-colors ${isInMeeting ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-surface-800 text-green-400 hover:bg-surface-700'}`}
          >
            {isInMeeting ? <TbPhoneOff size={14} /> : <TbVideoPlus size={14} />}
            <span className="hidden sm:inline">{isInMeeting ? 'Leave' : 'Join'}</span>
          </button>
          
          {isInMeeting && (
            <button
              onClick={handleToggleScreenShare}
              className={`px-2 py-1.5 rounded text-xs flex items-center gap-1.5 font-medium transition-colors ${isScreenSharing ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-surface-800 text-blue-400 hover:bg-surface-700'}`}
            >
              {isScreenSharing ? <TbScreenShareOff size={14} /> : <TbScreenShare size={14} />}
              <span className="hidden sm:inline">{isScreenSharing ? 'Stop Share' : 'Share'}</span>
            </button>
          )}
        </div>

        {/* Online members */}
        <div className="ml-2 md:ml-auto flex items-center gap-2 relative group">
          <div className="hidden sm:flex items-center gap-1 text-xs text-surface-400">
            <TbUsers size={14} />
            <span>{onlineCount} online</span>
          </div>
          <div className="flex -space-x-2">
            {safeMembers.slice(0, 5).map((m) => {
              const u = m.user || m;
              const act = activities[u._id || u.id];
              return (
                <div
                  key={u._id || u.id || Math.random()}
                  title={`${u.name} ${act ? `(${act.replace('_', ' ')})` : ''}`}
                  className={`w-7 h-7 rounded-full border-2 border-surface-900 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${act ? 'ring-2 ring-primary-500' : 'bg-primary-800'}`}
                >
                  {u.avatar ? <img src={u.avatar} alt={u.name} className="w-full h-full rounded-full object-cover" /> : u.name?.charAt(0)?.toUpperCase()}
                </div>
              );
            })}
            {safeMembers.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-surface-700 border-2 border-surface-900 flex items-center justify-center text-xs text-surface-300 font-bold">
                +{safeMembers.length - 5}
              </div>
            )}
          </div>
          
          {/* Live Activity Tooltip */}
          <div className="absolute top-full right-0 mt-2 bg-surface-800 border border-surface-700 rounded-lg p-2 shadow-xl hidden group-hover:block z-50 w-48">
            <h4 className="text-xs font-semibold text-surface-300 mb-2">Live Activities</h4>
            {Object.keys(activities).length === 0 ? (
              <p className="text-xs text-surface-500">No active collaboration</p>
            ) : (
              Object.entries(activities).map(([uid, act]) => {
                const user = safeMembers.find(m => (m.user?._id || m.user?.id) === uid)?.user;
                return user ? (
                  <div key={uid} className="text-xs flex items-center justify-between mb-1">
                    <span className="truncate max-w-[100px] text-white">{user.name}</span>
                    <span className="text-primary-400 capitalize">{act.replace('_', ' ')}</span>
                  </div>
                ) : null;
              })
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
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative" ref={containerRef}>
        
        {/* Meeting Manager & Overlay — wrapped in error boundaries so they can never crash the page */}
        <FeatureBoundary name="MeetingManager">
          <MeetingManager />
        </FeatureBoundary>
        <FeatureBoundary name="MeetingOverlay">
          <MeetingOverlay roomId={currentRoom?._id} />
        </FeatureBoundary>

        {/* Screen Share Viewer */}
        {meetingParticipants.some(p => p.isSharingScreen && p.screenStream) && (
          <FeatureBoundary name="ScreenShareViewer">
            <div className="absolute inset-0 z-40">
              <ScreenShareViewer stream={meetingParticipants.find(p => p.isSharingScreen && p.screenStream)?.screenStream} />
            </div>
          </FeatureBoundary>
        )}

        {/* Whiteboard Panel */}
        {(layout === 'both' || layout === 'whiteboard') && (
          <div
            className="flex-shrink-0 overflow-hidden"
            style={{ flexBasis: layout === 'both' ? `${dividerX}%` : '100%' }}
          >
            <WhiteboardPanel />
          </div>
        )}

        {/* Draggable Divider */}
        {layout === 'both' && (
          <div
            onMouseDown={handleDividerMouseDown}
            onTouchStart={handleDividerMouseDown}
            className={`flex-shrink-0 relative group transition-colors 
              h-1.5 w-full md:w-1.5 md:h-full 
              cursor-row-resize md:cursor-col-resize 
              hover:bg-primary-500/60 
              ${dragging ? 'bg-primary-500/80' : 'bg-surface-800'}`}
          >
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 md:inset-y-0 md:left-1/2 md:-translate-y-0 md:w-4 flex items-center justify-center">
              <TbGripVertical size={16} className="text-surface-600 group-hover:text-primary-400 transition-colors rotate-90 md:rotate-0" />
            </div>
          </div>
        )}

        {/* Editor or Document Panel */}
        {(layout === 'both' || layout === 'editor') && (
          <div
            className="flex-1 overflow-hidden md:border-l border-t md:border-t-0 border-surface-800"
            style={{ flexBasis: layout === 'both' ? `${100 - dividerX}%` : '100%' }}
          >
            {docId ? (
              <FeatureBoundary name="DocumentPanel">
                <DocumentPanel />
              </FeatureBoundary>
            ) : (
              <EditorPanel />
            )}
          </div>
        )}

        {/* Chat Sidebar */}
        {chatOpen && (
          <div className="absolute inset-y-0 right-0 w-[85vw] max-w-xs md:relative md:w-72 flex-shrink-0 z-50 border-l border-surface-800 animate-slide-right bg-surface-900 shadow-2xl md:shadow-none">
            <ChatPanel />
          </div>
        )}
      </div>
    </div>
  );
}
