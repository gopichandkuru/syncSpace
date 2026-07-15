import { create } from 'zustand';

export const useRoomStore = create((set) => ({
  currentRoom: null,
  rooms: [],
  myRooms: [],
  members: [],
  isInRoom: false,
  currentSession: null,

  setCurrentRoom: (room) => set({ currentRoom: room, isInRoom: !!room }),
  setRooms: (rooms) => set({ rooms }),
  setMyRooms: (myRooms) => set({ myRooms }),
  setMembers: (members) => set({ members }),
  setCurrentSession: (session) => set({ currentSession: session }),

  addRoom: (room) => set((state) => ({ rooms: [room, ...state.rooms] })),
  updateRoom: (id, updates) => set((state) => ({
    rooms: state.rooms.map((r) => (r._id === id ? { ...r, ...updates } : r)),
    myRooms: state.myRooms.map((r) => (r._id === id ? { ...r, ...updates } : r)),
    currentRoom: state.currentRoom?._id === id ? { ...state.currentRoom, ...updates } : state.currentRoom,
  })),
  removeRoom: (id) => set((state) => ({
    rooms: state.rooms.filter((r) => r._id !== id),
    myRooms: state.myRooms.filter((r) => r._id !== id),
  })),

  addMember: (member) => set((state) => ({
    members: [...state.members.filter((m) => m.id !== member.id), member],
  })),
  removeMember: (userId) => set((state) => ({
    members: state.members.filter((m) => m.id !== userId),
  })),
  updateMember: (userId, updates) => set((state) => ({
    members: state.members.map((m) => (m.id === userId ? { ...m, ...updates } : m)),
  })),

  leaveRoom: () => set({ currentRoom: null, members: [], isInRoom: false, currentSession: null }),
}));
