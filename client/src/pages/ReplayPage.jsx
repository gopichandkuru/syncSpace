import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Stage, Layer, Rect, Circle, Line, Text, Group } from 'react-konva';
import { replayService } from '../services';
import { useSocket } from '../context/SocketContext';
import { useWhiteboardStore } from '../store/whiteboardStore';
import { useRoomStore } from '../store/roomStore';
import { TbChevronLeft, TbPlayerPlay, TbPlayerPause, TbChevronRight, TbHistory } from 'react-icons/tb';
import toast from 'react-hot-toast';

export default function ReplayPage() {
  const { slug, sessionId } = useParams();
  const navigate = useNavigate();
  const { emitWhiteboardEvent } = useSocket();
  const { clearCanvas, addShape } = useWhiteboardStore();
  const { currentRoom } = useRoomStore();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [replayShapes, setReplayShapes] = useState([]);

  const animationFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  const playPositionRef = useRef(0);
  const lastUpdateRef = useRef(Date.now());

  useEffect(() => {
    const fetchReplay = async () => {
      try {
        const res = await replayService.getReplay(slug, sessionId);
        const fetchedEvents = res.data.data.replay?.events || [];
        setEvents(fetchedEvents);

        if (fetchedEvents.length > 0) {
          const firstTimestamp = fetchedEvents[0].timestamp;
          const normalized = fetchedEvents.map((e) => ({
            ...e,
            relativeTime: e.timestamp - firstTimestamp,
          }));
          setEvents(normalized);
          setDuration(normalized[normalized.length - 1].relativeTime);
        }
      } catch (err) {
        toast.error('Failed to load session replay history.');
        navigate(`/room/${slug}`);
      } finally {
        setLoading(false);
      }
    };
    fetchReplay();
  }, [slug, sessionId, navigate]);

  useEffect(() => {
    if (isPlaying) {
      lastUpdateRef.current = Date.now();
      const tick = () => {
        const now = Date.now();
        const delta = (now - lastUpdateRef.current) * playbackSpeed;
        lastUpdateRef.current = now;

        setCurrentTime((prev) => {
          const next = prev + delta;
          if (next >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return next;
        });

        animationFrameRef.current = requestAnimationFrame(tick);
      };
      animationFrameRef.current = requestAnimationFrame(tick);
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, playbackSpeed, duration]);

  // Re-calculate visible shapes on time update
  useEffect(() => {
    const visibleEvents = events.filter((e) => e.relativeTime <= currentTime);
    let shapes = [];

    visibleEvents.forEach((ev) => {
      if (ev.type === 'whiteboard') {
        const item = ev.data;
        if (item.type === 'add') {
          shapes.push(item.shape);
        } else if (item.type === 'update') {
          const idx = shapes.findIndex((s) => s.id === item.shape.id);
          if (idx !== -1) shapes[idx] = item.shape;
        } else if (item.type === 'delete') {
          shapes = shapes.filter((s) => !(item.ids || []).includes(s.id));
        } else if (item.type === 'clear') {
          shapes = [];
        }
      }
    });

    setReplayShapes(shapes);
  }, [currentTime, events]);

  const handleSliderChange = (e) => {
    setCurrentTime(Number(e.target.value));
  };

  const handleRestore = () => {
    if (!window.confirm("Restore this version to the live workspace? This will overwrite the current live board.")) return;
    const roomId = currentRoom?._id;
    if (!roomId) { toast.error('Room not found. Please open from the workspace page.'); return; }
    clearCanvas();
    replayShapes.forEach(addShape);
    emitWhiteboardEvent(roomId, { type: 'set_state', shapes: replayShapes });
    toast.success('Live workspace restored!');
    navigate(`/room/${slug}/collaborate`);
  };

  const renderShape = (shape) => {
    const common = { key: shape.id };
    if (shape.type === 'line') return <Line {...common} points={shape.points} stroke={shape.stroke} strokeWidth={shape.strokeWidth} lineCap={shape.lineCap || 'round'} lineJoin={shape.lineJoin || 'round'} tension={shape.tension || 0} globalCompositeOperation={shape.isEraser ? 'destination-out' : 'source-over'} />;
    if (shape.type === 'straightLine') return <Line {...common} points={shape.points} stroke={shape.stroke} strokeWidth={shape.strokeWidth} lineCap="round" />;
    if (shape.type === 'rect') return <Rect {...common} x={shape.x} y={shape.y} width={shape.width} height={shape.height} stroke={shape.stroke} strokeWidth={shape.strokeWidth} fill={shape.fill || 'transparent'} />;
    if (shape.type === 'circle') return <Circle {...common} x={shape.x} y={shape.y} radius={shape.radius} stroke={shape.stroke} strokeWidth={shape.strokeWidth} fill={shape.fill || 'transparent'} />;
    if (shape.type === 'text') return <Text {...common} x={shape.x} y={shape.y} text={shape.text} fill={shape.fill} fontSize={shape.fontSize || 18} fontFamily={shape.fontFamily || 'Inter, sans-serif'} />;
    if (shape.type === 'sticky') {
      return (
        <Group {...common} x={shape.x} y={shape.y}>
          <Rect width={150} height={150} fill={shape.fill} stroke={shape.stroke} strokeWidth={1} cornerRadius={4} shadowColor="black" shadowBlur={4} shadowOffset={{ x: 2, y: 2 }} shadowOpacity={0.15} />
          <Text width={150} height={150} text={shape.text} fill="#1e293b" align="center" verticalAlign="middle" padding={10} wrap="char" fontSize={16} fontFamily="Inter, sans-serif" />
        </Group>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-surface-950 space-y-4">
        <TbHistory className="text-primary-500 animate-spin" size={48} />
        <p className="text-surface-400 text-sm">Parsing history timeline...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-surface-950">
      <div className="h-14 border-b border-surface-850 bg-surface-900 px-6 flex items-center gap-4">
        <Link to={`/room/${slug}`} className="p-2 hover:bg-surface-800 rounded-lg text-surface-450 hover:text-white transition-colors">
          <TbChevronLeft size={20} />
        </Link>
        <span className="font-bold text-white">Session Replay Player</span>
        <div className="ml-auto">
          <button onClick={handleRestore} className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded text-sm font-medium transition-colors shadow">
            Restore to Live Workspace
          </button>
        </div>
      </div>

      {/* Replay Canvas Board */}
      <div className="flex-1 overflow-hidden bg-surface-950 border-b border-surface-850 flex items-center justify-center relative">
        {events.length === 0 ? (
          <div className="text-center space-y-2">
            <p className="text-surface-400">No draw operations recorded in this session.</p>
          </div>
        ) : (
          <Stage width={800} height={500} className="border border-surface-800 bg-surface-900 rounded-lg shadow-inner">
            <Layer>
              {replayShapes.map(renderShape)}
            </Layer>
          </Stage>
        )}
      </div>

      {/* Control Bar Timeline scrubber */}
      <div className="h-20 bg-surface-900 px-6 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-3 bg-primary-600 hover:bg-primary-500 rounded-full text-white focus:outline-none transition-colors"
          >
            {isPlaying ? <TbPlayerPause size={20} /> : <TbPlayerPlay size={20} />}
          </button>

          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="bg-surface-800 border border-surface-700 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="1">1x Speed</option>
            <option value="2">2x Speed</option>
            <option value="4">4x Speed</option>
          </select>
        </div>

        {/* Timeline Slider */}
        <div className="flex-1 flex items-center gap-3">
          <span className="text-xs text-surface-450">
            {Math.floor(currentTime / 1000)}s
          </span>
          <input
            type="range"
            min={0}
            max={duration}
            value={currentTime}
            onChange={handleSliderChange}
            className="w-full h-1.5 bg-surface-800 rounded-lg appearance-none cursor-pointer accent-primary-600"
          />
          <span className="text-xs text-surface-450">
            {Math.floor(duration / 1000)}s
          </span>
        </div>
      </div>
    </div>
  );
}
