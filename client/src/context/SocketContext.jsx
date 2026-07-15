import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useRoomStore } from '../store/roomStore';
import { useChatStore } from '../store/chatStore';
import { useNotificationStore } from '../store/notificationStore';
import { usePresenceStore } from '../store/notificationStore';
import { useWhiteboardStore } from '../store/whiteboardStore';
import { useMeetingStore } from '../store/meetingStore';
import { useDocumentStore } from '../store/documentStore';
import { useFileStore } from '../store/fileStore';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const SocketContext = createContext(null);

const EVENTS = {
  ROOM_JOIN: 'room:join', ROOM_LEAVE: 'room:leave', ROOM_JOINED: 'room:joined',
  ROOM_ERROR: 'room:error', USER_ONLINE: 'user:online', USER_OFFLINE: 'user:offline',
  CURSOR_MOVE: 'cursor:move', CURSOR_LEAVE: 'cursor:leave',
  TYPING_START: 'typing:start', TYPING_STOP: 'typing:stop',
  WHITEBOARD_EVENT: 'whiteboard:event', WHITEBOARD_CLEAR: 'whiteboard:clear',
  EDITOR_YJS_SYNC: 'editor:yjs:sync', EDITOR_YJS_UPDATE: 'editor:yjs:update',
  EDITOR_YJS_AWARENESS: 'editor:yjs:awareness', EDITOR_LANGUAGE_CHANGE: 'editor:language_change',
  CHAT_MESSAGE: 'chat:message', CHAT_MESSAGE_DELETED: 'chat:message_deleted', CHAT_SEEN: 'chat:seen',
  NOTIFICATION: 'notification',
  DOCUMENT_CREATED: 'document:created', FILE_CREATED: 'file:created'
};

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const { accessToken, isAuthenticated } = useAuthStore();
  const { setMembers, addMember, removeMember } = useRoomStore();
  const { addMessage, removeMessage, addTypingUser, removeTypingUser } = useChatStore();
  const { addNotification } = useNotificationStore();
  const applyRemoteEvent = useWhiteboardStore((s) => s.applyRemoteEvent);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => { setIsConnected(true); console.log('🔌 Socket connected'); });
    socket.on('disconnect', () => { setIsConnected(false); });
    socket.on('connect_error', (err) => { console.error('Socket error:', err.message); });

    socket.on(EVENTS.ROOM_JOINED, ({ room, members, whiteboardState, chatHistory, activeMeetingParticipants, activeScreenSharers }) => {
      setMembers(members);
      if (whiteboardState?.length) {
        useWhiteboardStore.getState().setInitialState(whiteboardState);
      }
      if (chatHistory?.length) {
        useChatStore.getState().setMessages(chatHistory);
      }
      if (activeMeetingParticipants?.length) {
        activeMeetingParticipants.forEach((id) => {
          if (id !== useAuthStore.getState().user?.id) {
            useMeetingStore.getState().addParticipant({ id });
          }
        });
      }
      if (activeScreenSharers?.length) {
        activeScreenSharers.forEach((id) => {
          if (id !== useAuthStore.getState().user?.id) {
            useMeetingStore.getState().addParticipant({ id, isSharingScreen: true });
          }
        });
      }
    });

    socket.on(EVENTS.ROOM_ERROR, ({ message }) => toast.error(message));

    socket.on(EVENTS.USER_ONLINE, ({ user, members }) => { if (members) setMembers(members); });
    socket.on(EVENTS.USER_OFFLINE, ({ userId, members }) => { if (members) setMembers(members); });

    socket.on(EVENTS.WHITEBOARD_EVENT, ({ event }) => { applyRemoteEvent(event); });
    socket.on(EVENTS.WHITEBOARD_CLEAR, () => { useWhiteboardStore.getState().clearCanvas(); });

    socket.on(EVENTS.CHAT_MESSAGE, ({ message }) => { addMessage(message); });
    socket.on(EVENTS.CHAT_MESSAGE_DELETED, ({ id }) => { removeMessage(id); });

    socket.on(EVENTS.TYPING_START, (user) => { addTypingUser(user); });
    socket.on(EVENTS.TYPING_STOP, ({ userId }) => { removeTypingUser(userId); });

    socket.on(EVENTS.NOTIFICATION, (n) => {
      addNotification(n);
      if (n.type !== 'cursor') toast(n.message, { icon: '🔔', duration: 3000 });
    });

    socket.on(EVENTS.DOCUMENT_CREATED, ({ document }) => {
      useDocumentStore.getState().addDocument(document);
    });

    socket.on(EVENTS.FILE_CREATED, ({ file }) => {
      useFileStore.getState().addFile(file);
    });

    return () => { socket.disconnect(); socketRef.current = null; setIsConnected(false); };
  }, [isAuthenticated, accessToken]);

  const joinRoom = (roomId, sessionId) => {
    socketRef.current?.emit(EVENTS.ROOM_JOIN, { roomId, sessionId });
  };

  const leaveRoom = () => {
    socketRef.current?.emit(EVENTS.ROOM_LEAVE);
  };

  const emitWhiteboardEvent = (roomId, event) => {
    socketRef.current?.emit(EVENTS.WHITEBOARD_EVENT, { roomId, event });
  };

  const emitCursorMove = (roomId, x, y, tool) => {
    socketRef.current?.emit(EVENTS.CURSOR_MOVE, { roomId, x, y, tool });
  };

  const emitTypingStart = (roomId) => socketRef.current?.emit(EVENTS.TYPING_START, { roomId });
  const emitTypingStop = (roomId) => socketRef.current?.emit(EVENTS.TYPING_STOP, { roomId });

  const emitChatMessage = (roomId, content, type, replyTo) => {
    socketRef.current?.emit(EVENTS.CHAT_MESSAGE, { roomId, content, type, replyTo });
  };

  const emitChatSeen = (roomId) => socketRef.current?.emit(EVENTS.CHAT_SEEN, { roomId });

  const emitYjsSync = (roomId, type, data) => {
    socketRef.current?.emit(EVENTS.EDITOR_YJS_SYNC, { roomId, type, data });
  };

  const emitYjsUpdate = (roomId, update) => {
    socketRef.current?.emit(EVENTS.EDITOR_YJS_UPDATE, { roomId, update });
  };

  const emitYjsAwareness = (roomId, update) => {
    socketRef.current?.emit(EVENTS.EDITOR_YJS_AWARENESS, { roomId, update });
  };

  const emitLanguageChange = (roomId, language) => {
    socketRef.current?.emit(EVENTS.EDITOR_LANGUAGE_CHANGE, { roomId, language });
  };

  const onYjsSync = (cb) => { socketRef.current?.on(EVENTS.EDITOR_YJS_SYNC, cb); return () => socketRef.current?.off(EVENTS.EDITOR_YJS_SYNC, cb); };
  const onYjsUpdate = (cb) => { socketRef.current?.on(EVENTS.EDITOR_YJS_UPDATE, cb); return () => socketRef.current?.off(EVENTS.EDITOR_YJS_UPDATE, cb); };
  const onYjsAwareness = (cb) => { socketRef.current?.on(EVENTS.EDITOR_YJS_AWARENESS, cb); return () => socketRef.current?.off(EVENTS.EDITOR_YJS_AWARENESS, cb); };
  const onLanguageChange = (cb) => { socketRef.current?.on(EVENTS.EDITOR_LANGUAGE_CHANGE, cb); return () => socketRef.current?.off(EVENTS.EDITOR_LANGUAGE_CHANGE, cb); };
  const onCursorMove = (cb) => { socketRef.current?.on(EVENTS.CURSOR_MOVE, cb); return () => socketRef.current?.off(EVENTS.CURSOR_MOVE, cb); };

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      isConnected,
      joinRoom,
      leaveRoom,
      emitCursorMove,
      emitTypingStart,
      emitTypingStop,
      emitWhiteboardEvent,
      emitWhiteboardClear: () => socketRef.current?.emit(EVENTS.WHITEBOARD_CLEAR),
      emitEditorSync: emitYjsSync,
      emitEditorUpdate: emitYjsUpdate,
      emitEditorAwareness: emitYjsAwareness,
      emitLanguageChange,
      emitMeetingJoin: (roomId) => socketRef.current?.emit('meeting:join', { roomId }),
      emitMeetingLeave: (roomId) => socketRef.current?.emit('meeting:leave', { roomId }),
      emitScreenShareStart: (roomId) => socketRef.current?.emit('screen_share:start', { roomId }),
      emitScreenShareStop: (roomId) => socketRef.current?.emit('screen_share:stop', { roomId }),
      emitUserActivityChange: (roomId, activity) => socketRef.current?.emit('user:activity_change', { roomId, activity }),
      emitWebRTCSignal: (targetUserId, signal, isScreen = false) => socketRef.current?.emit('webrtc:signal', { targetUserId, signal, isScreen }),
      onYjsSync, onYjsUpdate, onYjsAwareness, onLanguageChange, onCursorMove,
      EVENTS,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
export { EVENTS };
