import { create } from 'zustand';

export const useMeetingStore = create((set) => ({
  isInMeeting: false,
  isScreenSharing: false,
  meetingParticipants: [], // list of socket user objects with streams
  localStream: null,
  localScreenStream: null,
  audioEnabled: true,
  videoEnabled: true,

  setMeetingState: (state) => set((prev) => ({ ...prev, ...state })),
  
  addParticipant: (participant) => set((state) => {
    const existing = state.meetingParticipants.find(p => p.id === participant.id);
    if (existing) {
      return {
        meetingParticipants: state.meetingParticipants.map(p => 
          p.id === participant.id ? { ...p, ...participant } : p
        )
      };
    }
    return { meetingParticipants: [...state.meetingParticipants, participant] };
  }),

  removeParticipant: (userId) => set((state) => ({
    meetingParticipants: state.meetingParticipants.filter(p => p.id !== userId)
  })),

  clearMeeting: () => set({
    isInMeeting: false,
    isScreenSharing: false,
    meetingParticipants: [],
    localStream: null,
    localScreenStream: null,
  }),
}));
