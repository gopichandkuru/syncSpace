import { create } from 'zustand';

export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (n) => set((state) => ({
    notifications: [{ ...n, id: Date.now(), read: false, createdAt: new Date() }, ...state.notifications].slice(0, 50),
    unreadCount: state.unreadCount + 1,
  })),
  markAllRead: () => set((state) => ({
    notifications: state.notifications.map((n) => ({ ...n, read: true })),
    unreadCount: 0,
  })),
  markRead: (id) => set((state) => ({
    notifications: state.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
    unreadCount: Math.max(0, state.unreadCount - 1),
  })),
  clear: () => set({ notifications: [], unreadCount: 0 }),
}));

export const usePresenceStore = create((set) => ({
  cursors: {},
  setCursor: (userId, data) => set((state) => ({ cursors: { ...state.cursors, [userId]: data } })),
  removeCursor: (userId) => set((state) => {
    const next = { ...state.cursors };
    delete next[userId];
    return { cursors: next };
  }),
  clearCursors: () => set({ cursors: {} }),
}));
