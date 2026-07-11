import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Stage, Layer, Rect, Circle, Line, Text, Arrow, Transformer } from 'react-konva';
import { useSocket } from '../context/SocketContext';
import { useRoomStore } from '../store/roomStore';
import { useWhiteboardStore } from '../store/whiteboardStore';
import { useUIStore } from '../store/uiStore';
import ChatPanel from '../features/chat/ChatPanel';
import { TbChevronLeft, TbBrush, TbSquare, TbCircle, TbEraser, TbMouse, TbPalette, TbTrash, TbDownload, TbZoomIn, TbZoomOut, TbRotate } from 'react-icons/tb';
import toast from 'react-hot-toast';

export default function WhiteboardPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { currentRoom, currentSession } = useRoomStore();
  const { joinRoom, leaveRoom, emitWhiteboardEvent, onCursorMove, emitCursorMove } = useSocket();

  const {
    tool, setTool, color, setColor, shapes, addShape, updateShape, deleteShapes, clearCanvas,
    zoom, setZoom, panX, panY, setPan, selectedIds, setSelectedIds
  } = useWhiteboardStore();
  const { chatOpen, setChatOpen } = useUIStore();

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState(null);
  const [cursors, setCursors] = useState({});

  const stageRef = useRef(null);
  const trRef = useRef(null);

  useEffect(() => {
    if (!currentRoom) {
      navigate(`/room/${slug}`);
      return;
    }

    joinRoom(currentRoom._id, currentSession?._id);

    const cleanCursor = onCursorMove(({ userId, name, x, y, tool }) => {
      setCursors((prev) => ({ ...prev, [userId]: { name, x, y, tool } }));
    });

    return () => {
      cleanCursor();
      leaveRoom();
    };
  }, [currentRoom, slug, joinRoom, leaveRoom, onCursorMove]);

  // Cursor Move
  const handleMouseMove = (e) => {
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    if (!point || !currentRoom) return;

    emitCursorMove(currentRoom._id, point.x, point.y, tool);

    if (!isDrawing) return;

    const scale = stage.scaleX();
    const rx = (point.x - stage.x()) / scale;
    const ry = (point.y - stage.y()) / scale;

    if (tool === 'pen' || tool === 'eraser') {
      const lastLine = { ...currentLine };
      lastLine.points = lastLine.points.concat([rx, ry]);
      setCurrentLine(lastLine);

      // Locally update line
      updateShape(lastLine.id, lastLine);
    }
  };

  const handleMouseDown = (e) => {
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    if (!point) return;

    const clickedOnEmpty = e.target === stage;
    if (clickedOnEmpty) {
      setSelectedIds([]);
    }

    if (tool === 'select') return;

    setIsDrawing(true);
    const scale = stage.scaleX();
    const rx = (point.x - stage.x()) / scale;
    const ry = (point.y - stage.y()) / scale;

    const id = Math.random().toString(36).substring(7);

    let newShape = null;

    if (tool === 'pen' || tool === 'eraser') {
      newShape = {
        id,
        type: 'line',
        points: [rx, ry],
        stroke: tool === 'eraser' ? '#020617' : color,
        strokeWidth: tool === 'eraser' ? 30 : 3,
      };
      setCurrentLine(newShape);
    } else if (tool === 'rect') {
      newShape = {
        id,
        type: 'rect',
        x: rx,
        y: ry,
        width: 10,
        height: 10,
        stroke: color,
        strokeWidth: 3,
      };
    } else if (tool === 'circle') {
      newShape = {
        id,
        type: 'circle',
        x: rx,
        y: ry,
        radius: 10,
        stroke: color,
        strokeWidth: 3,
      };
    }

    if (newShape) {
      addShape(newShape);
      emitWhiteboardEvent(currentRoom._id, { type: 'add', shape: newShape });
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    if ((tool === 'pen' || tool === 'eraser') && currentLine) {
      emitWhiteboardEvent(currentRoom._id, { type: 'update', shape: currentLine });
    }
    setCurrentLine(null);
  };

  const handleShapeClick = (shapeId) => {
    if (tool === 'select') {
      setSelectedIds([shapeId]);
    }
  };

  const handleShapeDragEnd = (e, shapeId) => {
    const shape = shapes.find((s) => s.id === shapeId);
    if (!shape) return;

    const updated = {
      ...shape,
      x: e.target.x(),
      y: e.target.y(),
    };
    updateShape(shapeId, updated);
    emitWhiteboardEvent(currentRoom._id, { type: 'update', shape: updated });
  };

  const handleClear = () => {
    if (window.confirm('Clear canvas?')) {
      clearCanvas();
      emitWhiteboardEvent(currentRoom._id, { type: 'clear' });
    }
  };

  const handleExport = () => {
    const url = stageRef.current.toDataURL();
    const a = document.createElement('a');
    a.href = url;
    a.download = `whiteboard_${slug}.png`;
    a.click();
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-surface-950 overflow-hidden select-none">
      {/* Canvas Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Whiteboard Controls Bar */}
        <div className="h-14 border-b border-surface-850 bg-surface-900 px-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Link to={`/room/${slug}`} className="p-2 hover:bg-surface-800 rounded-lg text-surface-450 hover:text-white transition-colors">
              <TbChevronLeft size={20} />
            </Link>

            {/* Drawing Tools */}
            <div className="flex bg-surface-800 p-1 rounded-lg gap-1 border border-surface-700">
              <button onClick={() => setTool('select')} className={`p-1.5 rounded transition-colors ${tool === 'select' ? 'bg-primary-600 text-white' : 'text-surface-400 hover:text-white'}`}>
                <TbMouse size={16} />
              </button>
              <button onClick={() => setTool('pen')} className={`p-1.5 rounded transition-colors ${tool === 'pen' ? 'bg-primary-600 text-white' : 'text-surface-400 hover:text-white'}`}>
                <TbBrush size={16} />
              </button>
              <button onClick={() => setTool('rect')} className={`p-1.5 rounded transition-colors ${tool === 'rect' ? 'bg-primary-600 text-white' : 'text-surface-400 hover:text-white'}`}>
                <TbSquare size={16} />
              </button>
              <button onClick={() => setTool('circle')} className={`p-1.5 rounded transition-colors ${tool === 'circle' ? 'bg-primary-600 text-white' : 'text-surface-400 hover:text-white'}`}>
                <TbCircle size={16} />
              </button>
              <button onClick={() => setTool('eraser')} className={`p-1.5 rounded transition-colors ${tool === 'eraser' ? 'bg-primary-600 text-white' : 'text-surface-400 hover:text-white'}`}>
                <TbEraser size={16} />
              </button>
            </div>

            {/* Color Palette */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-7 h-7 rounded border border-surface-700 cursor-pointer bg-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="btn-secondary btn-sm" title="Export as PNG">
              <TbDownload size={16} />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button onClick={handleClear} className="btn-danger btn-sm" title="Clear Canvas">
              <TbTrash size={16} />
            </button>
            <button onClick={() => setChatOpen(!chatOpen)} className="btn-primary btn-sm">
              Chat {chatOpen ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {/* Canvas Board */}
        <div className="flex-1 overflow-hidden relative bg-surface-950">
          <Stage
            width={window.innerWidth - (chatOpen ? 320 : 0)}
            height={window.innerHeight - 64 - 56}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            ref={stageRef}
          >
            <Layer>
              {shapes.map((shape) => {
                if (shape.type === 'line') {
                  return (
                    <Line
                      key={shape.id}
                      points={shape.points}
                      stroke={shape.stroke}
                      strokeWidth={shape.strokeWidth}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                      onClick={() => handleShapeClick(shape.id)}
                    />
                  );
                } else if (shape.type === 'rect') {
                  return (
                    <Rect
                      key={shape.id}
                      x={shape.x}
                      y={shape.y}
                      width={shape.width}
                      height={shape.height}
                      stroke={shape.stroke}
                      strokeWidth={shape.strokeWidth}
                      draggable={tool === 'select'}
                      onClick={() => handleShapeClick(shape.id)}
                      onDragEnd={(e) => handleShapeDragEnd(e, shape.id)}
                    />
                  );
                } else if (shape.type === 'circle') {
                  return (
                    <Circle
                      key={shape.id}
                      x={shape.x}
                      y={shape.y}
                      radius={shape.radius}
                      stroke={shape.stroke}
                      strokeWidth={shape.strokeWidth}
                      draggable={tool === 'select'}
                      onClick={() => handleShapeClick(shape.id)}
                      onDragEnd={(e) => handleShapeDragEnd(e, shape.id)}
                    />
                  );
                }
                return null;
              })}

              {/* Dynamic Online cursors */}
              {Object.entries(cursors).map(([userId, cursor]) => (
                <Text
                  key={userId}
                  x={cursor.x}
                  y={cursor.y}
                  text={`📍 ${cursor.name}`}
                  fill="#ffffff"
                  fontSize={12}
                />
              ))}
            </Layer>
          </Stage>
        </div>
      </div>

      {/* Right Chat Sidebar */}
      {chatOpen && (
        <div className="w-80 border-l border-surface-850 flex-shrink-0 animate-slide-right">
          <ChatPanel />
        </div>
      )}
    </div>
  );
}
