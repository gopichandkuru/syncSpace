import { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line, Rect, Circle, Arrow, Text, Transformer, Group } from 'react-konva';
import { useWhiteboardStore } from '../../store/whiteboardStore';
import { useSocket } from '../../context/SocketContext';
import { useRoomStore } from '../../store/roomStore';
import {
  TbMouse, TbPencil, TbSquare, TbCircle, TbArrowUpRight,
  TbLine, TbLetterT, TbEraser, TbArrowBackUp, TbArrowForwardUp,
  TbTrash, TbDownload, TbZoomIn, TbZoomOut,
  TbHandGrab, TbNote, TbFileExport, TbFileImport, TbUpload,
  TbChevronLeft, TbChevronRight, TbSettings, TbPalette
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
  const [panelCollapsed, setPanelCollapsed] = useState(false);

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

  const handleShapeTransformEnd = (e, shapeId) => {
    const target = e.target;
    const shape = useWhiteboardStore.getState().shapes.find((s) => s.id === shapeId);
    if (!shape) return;

    let updatedShape = { ...shape };
    const scaleX = target.scaleX();
    const scaleY = target.scaleY();

    updatedShape.x = target.x();
    updatedShape.y = target.y();

    if (shape.type === 'rect') {
      updatedShape.width = (shape.width || 1) * scaleX;
      updatedShape.height = (shape.height || 1) * scaleY;
    } else if (shape.type === 'circle') {
      updatedShape.radius = (shape.radius || 1) * Math.max(scaleX, scaleY);
    } else if (shape.type === 'text') {
      updatedShape.fontSize = (shape.fontSize || 18) * Math.max(scaleX, scaleY);
    } else if (shape.type === 'sticky') {
      updatedShape.width = (shape.width || 150) * scaleX;
      updatedShape.height = (shape.height || 150) * scaleY;
    } else if (shape.type === 'line' || shape.type === 'straightLine' || shape.type === 'arrow') {
      const newPoints = [];
      for (let i = 0; i < shape.points.length; i += 2) {
        newPoints.push(shape.points[i] * scaleX);
        newPoints.push(shape.points[i + 1] * scaleY);
      }
      updatedShape.points = newPoints;
    }

    target.scaleX(1);
    target.scaleY(1);

    updateShape(shapeId, updatedShape);
    emitWhiteboardEvent(currentRoom?._id, { type: 'update', shape: updatedShape });
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
          useWhiteboardStore.getState().setShapes(imported);
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
      onTransformEnd: (e) => handleShapeTransformEnd(e, shape.id),
    };
    if (shape.type === 'line') return <Line {...common} points={shape.points} stroke={shape.stroke} strokeWidth={shape.strokeWidth} lineCap={shape.lineCap} lineJoin={shape.lineJoin} tension={shape.tension || 0} globalCompositeOperation={shape.isEraser ? 'destination-out' : 'source-over'} />;
    if (shape.type === 'rect') return <Rect {...common} x={shape.x} y={shape.y} width={shape.width} height={shape.height} stroke={shape.stroke} strokeWidth={shape.strokeWidth} fill={shape.fill || 'transparent'} />;
    if (shape.type === 'circle') return <Circle {...common} x={shape.x} y={shape.y} radius={shape.radius} stroke={shape.stroke} strokeWidth={shape.strokeWidth} fill={shape.fill || 'transparent'} />;
    if (shape.type === 'straightLine') return <Line {...common} points={shape.points} stroke={shape.stroke} strokeWidth={shape.strokeWidth} lineCap="round" />;
    if (shape.type === 'text') return <Text {...common} x={shape.x} y={shape.y} text={shape.text} fill={shape.fill} fontSize={shape.fontSize} fontFamily={shape.fontFamily} />;
    if (shape.type === 'sticky') {
      return (
        <Group {...common} x={shape.x} y={shape.y}>
          <Rect width={shape.width || 150} height={shape.height || 150} fill={shape.fill} stroke={shape.stroke} strokeWidth={1} cornerRadius={4} shadowColor="black" shadowBlur={4} shadowOffset={{ x: 2, y: 2 }} shadowOpacity={0.15} />
          <Text width={shape.width || 150} height={shape.height || 150} text={shape.text} fill="#1e293b" align="center" verticalAlign="middle" padding={10} wrap="char" fontSize={16} fontFamily="Inter, sans-serif" />
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
      className={`p-2.5 rounded-xl transition-all ${tool === id ? 'bg-primary-600 text-white shadow-md scale-105' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
    >
      {icon}
    </button>
  );

  return (
    <div className="w-full h-full bg-[#0b0f19] select-none relative overflow-hidden flex flex-col">
      {/* FLOATING TOP TOOLBAR */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-[#0b0f19]/80 backdrop-blur-md border border-slate-800/80 shadow-2xl rounded-2xl p-1.5 px-3 transition-all hover:border-slate-700">
        {toolBtn('select', <TbMouse size={18}/>, 'Select (V)')}
        {toolBtn('hand', <TbHandGrab size={18}/>, 'Pan (H)')}
        {toolBtn('pen', <TbPencil size={18}/>, 'Pen (P)')}
        {toolBtn('line', <TbLine size={18}/>, 'Line')}
        {toolBtn('arrow', <TbArrowUpRight size={18}/>, 'Arrow')}
        {toolBtn('rect', <TbSquare size={18}/>, 'Rectangle')}
        {toolBtn('circle', <TbCircle size={18}/>, 'Circle')}
        {toolBtn('text', <TbLetterT size={18}/>, 'Text')}
        {toolBtn('sticky', <TbNote size={18}/>, 'Sticky Note')}
        {toolBtn('eraser', <TbEraser size={18}/>, 'Eraser')}
      </div>

      {/* FLOATING PROPERTIES SIDEBAR / SETTINGS PANEL */}
      {panelCollapsed ? (
        <button
          onClick={() => setPanelCollapsed(false)}
          title="Show Style Properties"
          className="absolute top-4 left-4 z-20 p-3 bg-[#0b0f19]/90 backdrop-blur-md border border-slate-800/90 hover:border-slate-700 shadow-2xl rounded-2xl text-slate-400 hover:text-white transition-all scale-100 hover:scale-105"
        >
          <TbSettings size={20} />
        </button>
      ) : (
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-4 bg-[#0b0f19]/85 backdrop-blur-md border border-slate-800/80 shadow-2xl rounded-2xl p-4 w-60 max-h-[85%] overflow-y-auto no-scrollbar text-white transition-all">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-sm font-semibold flex items-center gap-1.5 text-slate-200">
              <TbPalette className="text-primary-400" size={16} />
              Canvas Settings
            </span>
            <button
              onClick={() => setPanelCollapsed(true)}
              title="Minimize Panel"
              className="p-1 rounded-lg text-slate-450 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <TbChevronLeft size={16} />
            </button>
          </div>

          {/* Color swatches */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Stroke Color</label>
            <div className="grid grid-cols-5 gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  title={c}
                  onClick={() => setColor(c)}
                  style={{ background: c }}
                  className={`w-6 h-6 rounded-lg border-2 transition-all ${color === c ? 'border-primary-400 scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-6 h-6 rounded-lg cursor-pointer bg-transparent border border-slate-700 p-0"
                title="Custom color"
              />
            </div>
          </div>

          {/* Brush size */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Stroke Width</label>
              <span className="text-xs font-bold text-primary-400 bg-primary-950/40 px-1.5 py-0.5 rounded-md">{strokeWidth}px</span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-full accent-primary-500 bg-slate-800 h-1 rounded-lg cursor-pointer"
            />
          </div>

          {/* Undo / Redo & Zoom unified row */}
          <div className="space-y-1.5 border-t border-slate-800 pt-3">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">History & View</label>
            <div className="flex items-center justify-between bg-slate-800/40 p-1 rounded-xl border border-slate-800/60">
              <div className="flex items-center gap-0.5">
                <button onClick={handleUndo} title="Undo (Ctrl+Z)" className="p-2 text-slate-450 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"><TbArrowBackUp size={16}/></button>
                <button onClick={handleRedo} title="Redo (Ctrl+Y)" className="p-2 text-slate-450 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"><TbArrowForwardUp size={16}/></button>
              </div>
              <div className="h-6 w-[1px] bg-slate-800" />
              <div className="flex items-center gap-0.5">
                <button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))} className="p-2 text-slate-450 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"><TbZoomOut size={16}/></button>
                <span className="text-[10px] text-slate-300 font-bold w-12 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(Math.min(4, zoom + 0.25))} className="p-2 text-slate-450 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"><TbZoomIn size={16}/></button>
              </div>
            </div>
          </div>

          {/* Action buttons (Clear / Export / Import) */}
          <div className="space-y-2 border-t border-slate-800 pt-3">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Actions</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold rounded-xl border border-slate-700/30 transition-colors"
                title="Export PNG"
              >
                <TbDownload size={14}/>
                <span>PNG</span>
              </button>
              <button
                onClick={handleExportJSON}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold rounded-xl border border-slate-700/30 transition-colors"
                title="Export JSON"
              >
                <TbFileExport size={14}/>
                <span>JSON</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-750/30 cursor-pointer transition-colors"
                title="Import JSON"
              >
                <TbFileImport size={14} />
                <span>Import JSON</span>
                <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
              </label>

              <button
                onClick={handleClear}
                className="p-2 bg-red-950/20 hover:bg-red-900/30 border border-red-900/30 hover:border-red-800/40 text-red-400 hover:text-red-300 rounded-xl transition-all"
                title="Clear Canvas"
              >
                <TbTrash size={16}/>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANVAS CONTAINER */}
      <div ref={containerRef} className="flex-1 w-full h-full relative bg-[#0b0f19]">
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
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 ring-4 ring-indigo-400/20 shadow-glow" />
            <span className="bg-indigo-600/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shadow-2xl border border-indigo-500/20">
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
