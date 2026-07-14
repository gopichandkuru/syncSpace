import { create } from 'zustand';

export const useWhiteboardStore = create((set, get) => ({
  tool: 'pen',
  color: '#6366f1',
  strokeWidth: 3,
  fontSize: 16,
  opacity: 1,
  shapes: [],
  selectedIds: [],
  history: [],
  historyIndex: -1,
  zoom: 1,
  panX: 0,
  panY: 0,
  isDirty: false,

  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setFontSize: (fontSize) => set({ fontSize }),
  setOpacity: (opacity) => set({ opacity }),
  setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 0.1), 10) }),
  setPan: (panX, panY) => set({ panX, panY }),
  setSelectedIds: (selectedIds) => set({ selectedIds }),
  setShapes: (shapes) => set({ shapes }),

  addShape: (shape) => set((state) => {
    const newShapes = [...state.shapes, shape];
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(newShapes);
    return { shapes: newShapes, history: newHistory, historyIndex: newHistory.length - 1, isDirty: true };
  }),

  // Live mouse-move updates — no history commit (avoids history spam)
  updateShapeNoHistory: (id, updates) => set((state) => {
    const newShapes = state.shapes.map((s) => (s.id === id ? { ...s, ...updates } : s));
    return { shapes: newShapes, isDirty: true };
  }),

  // Final update on mouseUp — commits to history
  updateShape: (id, updates) => set((state) => {
    const newShapes = state.shapes.map((s) => (s.id === id ? { ...s, ...updates } : s));
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(newShapes);
    return { shapes: newShapes, history: newHistory, historyIndex: newHistory.length - 1, isDirty: true };
  }),

  deleteShapes: (ids) => set((state) => {
    const newShapes = state.shapes.filter((s) => !ids.includes(s.id));
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(newShapes);
    return { shapes: newShapes, history: newHistory, historyIndex: newHistory.length - 1, selectedIds: [], isDirty: true };
  }),

  applyRemoteEvent: (event) => set((state) => {
    let newShapes = [...state.shapes];
    if (event.type === 'add') {
      if (!newShapes.find((s) => s.id === event.shape.id)) newShapes.push(event.shape);
    } else if (event.type === 'update') {
      newShapes = newShapes.map((s) => (s.id === event.shape.id ? event.shape : s));
    } else if (event.type === 'delete') {
      newShapes = newShapes.filter((s) => !(event.ids || []).includes(s.id));
    } else if (event.type === 'clear') {
      newShapes = [];
    } else if (event.type === 'set_state') {
      newShapes = event.shapes || [];
    }
    return { shapes: newShapes };
  }),

  undo: () => set((state) => {
    if (state.historyIndex <= 0) return {};
    const newIndex = state.historyIndex - 1;
    return { shapes: state.history[newIndex] || [], historyIndex: newIndex };
  }),

  redo: () => set((state) => {
    if (state.historyIndex >= state.history.length - 1) return {};
    const newIndex = state.historyIndex + 1;
    return { shapes: state.history[newIndex], historyIndex: newIndex };
  }),

  clearCanvas: () => set((state) => {
    const newHistory = [...state.history.slice(0, state.historyIndex + 1), []];
    return { shapes: [], history: newHistory, historyIndex: newHistory.length - 1, selectedIds: [] };
  }),

  setInitialState: (shapes) => set({ shapes, history: [shapes], historyIndex: 0 }),
  markClean: () => set({ isDirty: false }),
}));
