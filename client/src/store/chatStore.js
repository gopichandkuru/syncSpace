import { create } from 'zustand';

export const useChatStore = create((set) => ({
  messages: [],
  isLoading: false,
  hasMore: true,
  typingUsers: [],
  unreadCount: 0,

  setMessages: (messages) => set({ messages }),
  addMessage: (msg) => set((state) => {
    if (state.messages.some((m) => m._id === msg._id)) return {};
    return { messages: [...state.messages, msg] };
  }),
  removeMessage: (id) => set((state) => ({
    messages: state.messages.map((m) => m._id === id ? { ...m, isDeleted: true, content: '[Message deleted]' } : m),
  })),
  setLoading: (isLoading) => set({ isLoading }),
  setHasMore: (hasMore) => set({ hasMore }),
  addTypingUser: (user) => set((state) => ({
    typingUsers: [...state.typingUsers.filter((u) => u.userId !== user.userId), user],
  })),
  removeTypingUser: (userId) => set((state) => ({
    typingUsers: state.typingUsers.filter((u) => u.userId !== userId),
  })),
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  resetUnread: () => set({ unreadCount: 0 }),
  reset: () => set({ messages: [], hasMore: true, typingUsers: [], unreadCount: 0 }),
}));
