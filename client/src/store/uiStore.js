import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUIStore = create(
  persist(
    (set) => ({
      theme: 'dark',
      sidebarOpen: true,
      sidebarTab: 'members',
      chatOpen: true,
      activePanel: 'whiteboard',
      notificationsOpen: false,
      modals: {},

      setTheme: (theme) => {
        set({ theme });
        document.documentElement.className = theme;
      },
      toggleTheme: () => set((state) => {
        const next = state.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.className = next;
        return { theme: next };
      }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarTab: (tab) => set({ sidebarTab: tab }),
      setChatOpen: (open) => set({ chatOpen: open }),
      setActivePanel: (panel) => set({ activePanel: panel }),
      setNotificationsOpen: (open) => set({ notificationsOpen: open }),
      openModal: (name, data = {}) => set((state) => ({ modals: { ...state.modals, [name]: { open: true, data } } })),
      closeModal: (name) => set((state) => ({ modals: { ...state.modals, [name]: { open: false, data: {} } } })),
    }),
    { name: 'syncspace-ui', partialize: (s) => ({ theme: s.theme, sidebarOpen: s.sidebarOpen }) }
  )
);
