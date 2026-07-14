import { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line, Rect, Circle, Arrow, Text, Transformer, Group } from 'react-konva';
import { useWhiteboardStore } from '../../store/whiteboardStore';
import { useSocket } from '../../context/SocketContext';
import { useRoomStore } from '../../store/roomStore';
import {
  TbMouse, TbPencil, TbSquare, TbCircle, TbArrowUpRight,
  TbLine, TbLetterT, TbEraser, TbArrowBackUp, TbArrowForwardUp,
  TbTrash, TbDownload, TbZoomIn, TbZoomOut,
  TbHandGrab, TbNote, TbFileExport, TbFileImport, TbUpload
} from 'react-icons/tb';
import toast from 'react-hot-toast';

const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#ffffff','#000000','#64748b'];

function genId() { return Math.random().toString(36).slice(2, 9); }

export default function WhiteboardPanel({ height = 500 }) {
  const { currentRoom } = useRoomStore();
  const { emitWhiteboardEvent, onCursorMove, emitCursorMove } = useSocket();

  const {
    tool, setTool, color, setColor, strokeWidth, setStrokeWidth,
    shapes, addShape, updateShape, updateShapeNoHistory, deleteShapes, clearCanvas,
    zoom, setZoom, selectedIds, setSelectedIds, undo, redo,
  } = useWhiteboardStore();

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShapeId, setCurrentShapeId] = useState(null);
  const [textInput, setTextInput] = useState(null); // { x, y, value }
  const [remoteCursors, setRemoteCursors] = useState({});
  const [stageSize, setStageSize] = useState({ width: 800, height });
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const trRef = useRef(null);
  const cursorThrottleRef = useRef(null);

  const handleUndo = () => {
    undo();
    setTimeout(() => {
      const currentShapes = useWhiteboardStore.getState().shapes;
      emitWhiteboardEvent(currentRoom?._id, { type: 'set_state', shapes: currentShapes });
    }, 0);
  };

  const handleRedo = () => {
    redo();
    setTimeout(() => {
      const currentShapes = useWhiteboardStore.getState().shapes;
      emitWhiteboardEvent(currentRoom?._id, { type: 'set_state', shapes: currentShapes });
    }, 0);
  };

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height: h } = entries[0].contentRect;
      setStageSize({ width, height: h });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Remote cursors
  useEffect(() => {
    const clean = onCursorMove(({ userId, name, x, y }) => {
      setRemoteCursors((prev) => ({ ...prev, [userId]: { name, x, y } }));
    });
    return clean;
  }, [onCursorMove]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); handleRedo(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          deleteShapes(selectedIds);
          emitWhiteboardEvent(currentRoom?._id, { type: 'delete', ids: selectedIds });
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedIds, undo, redo, deleteShapes, emitWhiteboardEvent, currentRoom]);

  // Transformer update
  useEffect(() => {
    if (trRef.current && selectedIds.length > 0) {
      const nodes = selectedIds.map((id) => stageRef.current?.findOne(`#${id}`)).filter(Boolean);
      trRef.current.nodes(nodes);
      trRef.current.getLayer()?.batchDraw();
    } else {
      trRef.current?.nodes([]);
    }
  }, [selectedIds, shapes]);

  const getScaledPos = (stage, point) => ({
    x: (point.x - stage.x()) / stage.scaleX(),
    y: (point.y - stage.y()) / stage.scaleY(),
  });

  const handleMouseDown = useCallback((e) => {
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    if (!point) return;

    if (e.target === stage) setSelectedIds([]);
    if (tool === 'select' || tool === 'hand') return; // hand tool uses stage dragging, not shape drawing

    setIsDrawing(true);
    const pos = getScaledPos(stage, point);
    const id = genId();

    let shape = null;
    if (tool === 'pen') {
      shape = { id, type: 'line', points: [pos.x, pos.y], stroke: color, strokeWidth, lineCap: 'round', lineJoin: 'round', tension: 0.4 };
    } else if (tool === 'eraser') {
      shape = { id, type: 'line', points: [pos.x, pos.y], stroke: '#1e1b4b', strokeWidth: strokeWidth * 4, lineCap: 'round', lineJoin: 'round', globalCompositeOperation: 'destination-out', isEraser: true };
    } else if (tool === 'rect') {
      shape = { id, type: 'rect', x: pos.x, y: pos.y, width: 1, height: 1, stroke: color, strokeWidth, fill: 'transparent' };
    } else if (tool === 'circle') {
      shape = { id, type: 'circle', x: pos.x, y: pos.y, radius: 1, stroke: color, strokeWidth, fill: 'transparent' };
    } else if (tool === 'line') {
      shape = { id, type: 'straightLine', points: [pos.x, pos.y, pos.x, pos.y], stroke: color, strokeWidth, lineCap: 'round' };
    } else if (tool === 'arrow') {
      shape = { id, type: 'arrow', points: [pos.x, pos.y, pos.x, pos.y], stroke: color, strokeWidth, fill: color, pointerLength: 12, pointerWidth: 10 };
    } else if (tool === 'text') {
      setTextInput({ x: point.x, y: point.y, sceneX: pos.x, sceneY: pos.y, value: '' });
      return;
    } else if (tool === 'sticky') {
      setTextInput({ x: point.x, y: point.y, sceneX: pos.x, sceneY: pos.y, value: '', isSticky: true });
      return;
    }

    if (shape) {
      addShape(shape);
      setCurrentShapeId(id);
      emitWhiteboardEvent(currentRoom?._id, { type: 'add', shape });
    }
  }, [tool, color, strokeWidth, addShape, emitWhiteboardEvent, currentRoom, setSelectedIds]);

  const handleMouseMove = useCallback((e) => {
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    if (!point) return;

    // Throttle cursor emit
    if (!cursorThrottleRef.current) {
      emitCursorMove?.(currentRoom?._id, point.x, point.y, tool);
      cursorThrottleRef.current = setTimeout(() => { cursorThrottleRef.current = null; }, 50);
    }

    if (!isDrawing || !currentShapeId) return;
    const pos = getScaledPos(stage, point);
    const shape = useWhiteboardStore.getState().shapes.find((s) => s.id === currentShapeId);
    if (!shape) return;

    if (shape.type === 'line') {
      updateShapeNoHistory(currentShapeId, { points: [...shape.points, pos.x, pos.y] });
    } else if (shape.type === 'rect') {
      updateShapeNoHistory(currentShapeId, { width: pos.x - shape.x, height: pos.y - shape.y });
    } else if (shape.type === 'circle') {
      const r = Math.hypot(pos.x - shape.x, pos.y - shape.y);
      updateShapeNoHistory(currentShapeId, { radius: r });
    } else if (shape.type === 'straightLine' || shape.type === 'arrow') {
      updateShapeNoHistory(currentShapeId, { points: [shape.points[0], shape.points[1], pos.x, pos.y] });
    }
  }, [isDrawing, currentShapeId, updateShapeNoHistory, emitCursorMove, currentRoom, tool]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentShapeId) { setIsDrawing(false); return; }
    setIsDrawing(false);
    const shape = useWhiteboardStore.getState().shapes.find((s) => s.id === currentShapeId);
    if (shape) {
      updateShape(currentShapeId, shape); // commit to history
      emitWhiteboardEvent(currentRoom?._id, { type: 'update', shape });
    }
    setCurrentShapeId(null);
  }, [isDrawing, currentShapeId, updateShape, emitWhiteboardEvent, currentRoom]);

  const handleShapeClick = (e, shapeId) => {
    if (tool !== 'select') return;
    e.cancelBubble = true;
    setSelectedIds([shapeId]);
  };

  const handleShapeDragEnd = (e, shapeId) => {
    const shape = { ...useWhiteboardStore.getState().shapes.find((s) => s.id === shapeId), x: e.target.x(), y: e.target.y() };
    updateShape(shapeId, shape);
    emitWhiteboardEvent(currentRoom?._id, { type: 'update', shape });
  };

  const handleStageDragEnd = (e) => {
    if (e.target === e.target.getStage()) setPan({ x: e.target.x(), y: e.target.y() });
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(useWhiteboardStore.getState().shapes, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = 'whiteboard.json';
    a.click();
    toast.success('Exported JSON');
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          clearCanvas();
          imported.forEach(addShape);
          emitWhiteboardEvent(currentRoom?._id, { type: 'set_state', shapes: imported });
          toast.success('Imported JSON successfully');
        }
      } catch { toast.error('Invalid JSON file'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!textInput?.value.trim()) { setTextInput(null); return; }
    const id = genId();
    let shape;
    if (textInput.isSticky) {
      shape = { id, type: 'sticky', x: textInput.sceneX, y: textInput.sceneY, text: textInput.value, fill: '#fef08a', stroke: '#eab308' };
    } else {
      shape = { id, type: 'text', x: textInput.sceneX, y: textInput.sceneY, text: textInput.value, fill: color, fontSize: 18, fontFamily: 'Inter, sans-serif' };
    }
    addShape(shape);
    emitWhiteboardEvent(currentRoom?._id, { type: 'add', shape });
    setTextInput(null);
  };

  const handleClear = () => {
    if (!window.confirm('Clear canvas? This cannot be undone.')) return;
    clearCanvas();
    emitWhiteboardEvent(currentRoom?._id, { type: 'clear' });
  };

  const handleExport = () => {
    const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
    const a = document.createElement('a'); a.href = uri; a.download = 'whiteboard.png'; a.click();
  };

  const renderShape = (shape) => {
    const common = {
      key: shape.id,
      id: shape.id,
      onClick: (e) => handleShapeClick(e, shape.id),
      draggable: tool === 'select',
      onDragEnd: (e) => handleShapeDragEnd(e, shape.id),
    };
    if (shape.type === 'line') return <Line {...common} points={shape.points} stroke={shape.stroke} strokeWidth={shape.strokeWidth} lineCap={shape.lineCap} lineJoin={shape.lineJoin} tension={shape.tension || 0} globalCompositeOperation={shape.isEraser ? 'destination-out' : 'source-over'} />;
    if (shape.type === 'rect') return <Rect {...common} x={shape.x} y={shape.y} width={shape.width} height={shape.height} stroke={shape.stroke} strokeWidth={shape.strokeWidth} fill={shape.fill || 'transparent'} />;
    if (shape.type === 'circle') return <Circle {...common} x={shape.x} y={shape.y} radius={shape.radius} stroke={shape.stroke} strokeWidth={shape.strokeWidth} fill={shape.fill || 'transparent'} />;
    if (shape.type === 'straightLine') return <Line {...common} points={shape.points} stroke={shape.stroke} strokeWidth={shape.strokeWidth} lineCap="round" />;
    if (shape.type === 'text') return <Text {...common} x={shape.x} y={shape.y} text={shape.text} fill={shape.fill} fontSize={shape.fontSize} fontFamily={shape.fontFamily} />;
    if (shape.type === 'sticky') {
      return (
        <Group {...common} x={shape.x} y={shape.y}>
          <Rect width={150} height={150} fill={shape.fill} stroke={shape.stroke} strokeWidth={1} cornerRadius={4} shadowColor="black" shadowBlur={4} shadowOffset={{ x: 2, y: 2 }} shadowOpacity={0.15} />
          <Text width={150} height={150} text={shape.text} fill="#1e293b" align="center" verticalAlign="middle" padding={10} wrap="char" fontSize={16} fontFamily="Inter, sans-serif" />
        </Group>
      );
    }
    if (shape.type === 'arrow') return <Arrow {...common} points={shape.points} stroke={shape.stroke} fill={shape.fill || shape.stroke} strokeWidth={shape.strokeWidth} pointerLength={shape.pointerLength || 12} pointerWidth={shape.pointerWidth || 10} />;
    return null;
  };

  const toolBtn = (id, icon, label) => (
    <button
      key={id}
      title={label}
      onClick={() => setTool(id)}
      className={`p-1.5 rounded transition-all ${tool === id ? 'bg-primary-600 text-white shadow-sm' : 'text-surface-400 hover:text-white hover:bg-surface-700'}`}
    >
      {icon}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-surface-950 overflow-hidden select-none relative">
      {/* Toolbar */}
      <div className="flex-shrink-0 h-12 bg-surface-900 border-b border-surface-800 px-3 flex items-center gap-2 flex-wrap">
        {/* Tools */}
        <div className="flex items-center gap-0.5 bg-surface-800 rounded-lg p-1 border border-surface-700">
          {toolBtn('select', <TbMouse size={15}/>, 'Select (V)')}
          {toolBtn('hand', <TbHandGrab size={15}/>, 'Pan (H)')}
          {toolBtn('pen', <TbPencil size={15}/>, 'Pen (P)')}
          {toolBtn('line', <TbLine size={15}/>, 'Line')}
          {toolBtn('arrow', <TbArrowUpRight size={15}/>, 'Arrow')}
          {toolBtn('rect', <TbSquare size={15}/>, 'Rectangle')}
          {toolBtn('circle', <TbCircle size={15}/>, 'Circle')}
          {toolBtn('text', <TbLetterT size={15}/>, 'Text')}
          {toolBtn('sticky', <TbNote size={15}/>, 'Sticky Note')}
          {toolBtn('eraser', <TbEraser size={15}/>, 'Eraser')}
        </div>

        {/* Color swatches */}
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              title={c}
              onClick={() => setColor(c)}
              style={{ background: c }}
              className={`w-5 h-5 rounded-full border-2 transition-transform ${color === c ? 'border-primary-400 scale-125' : 'border-transparent hover:scale-110'}`}
            />
          ))}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer bg-transparent border border-surface-700 p-0" title="Custom color" />
        </div>

        {/* Brush size */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-surface-400">Size</span>
          <input type="range" min={1} max={30} value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-20 accent-primary-500" />
          <span className="text-xs text-surface-400 w-5">{strokeWidth}</span>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Undo / Redo */}
          <button onClick={handleUndo} title="Undo (Ctrl+Z)" className="p-1.5 text-surface-400 hover:text-white hover:bg-surface-700 rounded transition-colors"><TbArrowBackUp size={15}/></button>
          <button onClick={handleRedo} title="Redo (Ctrl+Y)" className="p-1.5 text-surface-400 hover:text-white hover:bg-surface-700 rounded transition-colors"><TbArrowForwardUp size={15}/></button>

          {/* Zoom */}
          <button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))} className="p-1.5 text-surface-400 hover:text-white hover:bg-surface-700 rounded transition-colors"><TbZoomOut size={15}/></button>
          <span className="text-xs text-surface-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(4, zoom + 0.25))} className="p-1.5 text-surface-400 hover:text-white hover:bg-surface-700 rounded transition-colors"><TbZoomIn size={15}/></button>

          <button onClick={handleExport} title="Export PNG" className="p-1.5 text-surface-400 hover:text-white hover:bg-surface-700 rounded transition-colors"><TbDownload size={15}/></button>
          <button onClick={handleExportJSON} title="Export JSON" className="p-1.5 text-surface-400 hover:text-white hover:bg-surface-700 rounded transition-colors"><TbFileExport size={15}/></button>
          <label className="p-1.5 text-surface-400 hover:text-white hover:bg-surface-700 rounded transition-colors cursor-pointer" title="Import JSON">
            <TbFileImport size={15} />
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
          <button onClick={handleClear} title="Clear Canvas" className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"><TbTrash size={15}/></button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 overflow-hidden relative bg-[#0f172a]">
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          x={pan.x}
          y={pan.y}
          draggable={tool === 'hand'}
          onDragEnd={handleStageDragEnd}
          scaleX={zoom}
          scaleY={zoom}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          style={{ cursor: tool === 'eraser' ? 'cell' : tool === 'text' || tool === 'sticky' ? 'text' : tool === 'hand' ? 'grab' : tool === 'select' ? 'default' : 'crosshair' }}
        >
          <Layer>
            {shapes.map(renderShape)}
            <Transformer ref={trRef} boundBoxFunc={(oldBox, newBox) => newBox} />
          </Layer>
        </Stage>

        {/* Remote cursors as HTML overlays */}
        {Object.entries(remoteCursors).map(([userId, cursor]) => (
          <div
            key={userId}
            className="absolute pointer-events-none z-10 flex items-center gap-1"
            style={{ left: cursor.x, top: cursor.y, transform: 'translate(8px, -4px)' }}
          >
            <div className="w-2 h-2 rounded-full bg-green-400 ring-2 ring-green-400/30" />
            <span className="bg-green-500/90 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap shadow-lg">
              {cursor.name}
            </span>
          </div>
        ))}

        {/* Text input overlay */}
        {textInput && (
          <form onSubmit={handleTextSubmit} style={{ position: 'absolute', left: textInput.x, top: textInput.y, zIndex: 20 }}>
            <input
              autoFocus
              type="text"
              value={textInput.value}
              onChange={(e) => setTextInput((p) => ({ ...p, value: e.target.value }))}
              onBlur={handleTextSubmit}
              className="bg-transparent border-b-2 border-primary-500 outline-none text-white text-lg px-1 min-w-[120px]"
              style={{ color, fontFamily: 'Inter, sans-serif', fontSize: 18 }}
              placeholder="Type here..."
            />
          </form>
        )}
      </div>
    </div>
  );
}
