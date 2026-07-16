const Y = require('yjs');
const awarenessProtocol = require('y-protocols/awareness');
const syncProtocol = require('y-protocols/sync');
const encoding = require('lib0/encoding');
const decoding = require('lib0/decoding');
const { Server } = require('socket.io');
const EVENTS = require('../events/socket.events');
const { verifyAccessToken } = require('../config/jwt');
const User = require('../models/User');
const Room = require('../models/Room');
const chatService = require('../services/chat.service');
const replayService = require('../services/replay.service');

// In-memory: roomId -> { doc, awareness, whiteboardState, connectedUsers, sessionId, replayBuffer }
const roomDocs = new Map();
// In-memory: docId -> Y.Doc
const documentDocs = new Map();

function getOrCreateDocYjs(docId) {
  if (!documentDocs.has(docId)) {
    documentDocs.set(docId, new Y.Doc());
  }
  return documentDocs.get(docId);
}

function getOrCreateRoomDoc(roomId) {
  if (!roomDocs.has(roomId)) {
    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);
    roomDocs.set(roomId, {
      doc,
      awareness,
      whiteboardState: [],
      connectedUsers: new Map(),
      meetingParticipants: new Set(),
      screenSharers: new Set(),
      sessionId: null,
      replayBuffer: [],
      isInitializedFromDB: false,
    });
  }
  return roomDocs.get(roomId);
}

function initializeSocket(server) {
  // Build allowed origins array (supports comma-separated CLIENT_URL for multi-origin)
  const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map((u) => u.trim())
    : [];

  const io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        // Allow server-to-server (no origin) or localhost in dev
        if (!origin) return callback(null, true);
        if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost')) {
          return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Socket CORS: Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers['authorization']?.split(' ')[1];
      if (!token) return next(new Error('Authentication required'));
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id).select('name email avatar');
      if (!user) return next(new Error('User not found'));
      socket.user = { id: user._id.toString(), name: user.name, email: user.email, avatar: user.avatar };
      await User.findByIdAndUpdate(user._id, { isOnline: true });
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Connected: ${socket.user.name} [${socket.id}]`);

    // ── Room join ─────────────────────────────────────────────────
    socket.on(EVENTS.ROOM_JOIN, async ({ roomId, sessionId }) => {
      try {
        const room = await Room.findById(roomId).populate('members.user', 'name email avatar isOnline');
        if (!room) return socket.emit(EVENTS.ROOM_ERROR, { message: 'Room not found' });

        const isMember = room.members.some((m) => m.user._id.toString() === socket.user.id);
        if (!isMember && room.type !== 'public') {
          return socket.emit(EVENTS.ROOM_ERROR, { message: 'Access denied' });
        }

        socket.join(roomId);
        socket.currentRoom = roomId;
        socket.currentSession = sessionId || null;

        const roomData = getOrCreateRoomDoc(roomId);
        
        // Initialize from DB if first time
        if (!roomData.isInitializedFromDB) {
          if (room.whiteboardState && Array.isArray(room.whiteboardState)) {
            roomData.whiteboardState = room.whiteboardState;
          }
          if (room.yjsState) {
            try {
              Y.applyUpdate(roomData.doc, new Uint8Array(room.yjsState));
            } catch (err) {
              console.error('Error applying yjs state from DB:', err);
            }
          }
          roomData.isInitializedFromDB = true;
        }

        roomData.connectedUsers.set(socket.id, { ...socket.user, socketId: socket.id, joinedAt: Date.now() });
        if (sessionId) roomData.sessionId = sessionId;

        const members = Array.from(roomData.connectedUsers.values());
        
        // Fetch recent chat history
        const recentMessages = await chatService.getMessages(roomId, socket.user.id, { limit: 50 });

        socket.emit(EVENTS.ROOM_JOINED, {
          room: { _id: room._id, name: room.name, slug: room.slug, type: room.type, activeMode: room.activeMode, settings: room.settings },
          members,
          whiteboardState: roomData.whiteboardState,
          chatHistory: recentMessages,
          activeMeetingParticipants: Array.from(roomData.meetingParticipants),
          activeScreenSharers: Array.from(roomData.screenSharers),
        });

        // Send Yjs state
        const stateVector = Y.encodeStateVector(roomData.doc);
        socket.emit(EVENTS.EDITOR_YJS_SYNC, { type: 'sv', data: Array.from(stateVector) });

        socket.to(roomId).emit(EVENTS.USER_ONLINE, { user: socket.user, members });
        socket.to(roomId).emit(EVENTS.NOTIFICATION, {
          type: 'user_joined',
          message: `${socket.user.name} joined the room`,
          userId: socket.user.id,
        });
      } catch (err) {
        console.error('ROOM_JOIN error:', err);
        socket.emit(EVENTS.ROOM_ERROR, { message: err.message });
      }
    });

    socket.on(EVENTS.ROOM_LEAVE, () => leaveRoom(socket, io));

    // ── Cursor ─────────────────────────────────────────────────────
    socket.on(EVENTS.CURSOR_MOVE, ({ roomId, x, y, tool }) => {
      socket.to(roomId || socket.currentRoom).emit(EVENTS.CURSOR_MOVE, {
        userId: socket.user.id,
        name: socket.user.name,
        avatar: socket.user.avatar,
        x,
        y,
        tool,
      });
    });

    // ── Typing ─────────────────────────────────────────────────────
    socket.on(EVENTS.TYPING_START, ({ roomId }) => {
      socket.to(roomId || socket.currentRoom).emit(EVENTS.TYPING_START, {
        userId: socket.user.id,
        name: socket.user.name,
      });
    });
    socket.on(EVENTS.TYPING_STOP, ({ roomId }) => {
      socket.to(roomId || socket.currentRoom).emit(EVENTS.TYPING_STOP, { userId: socket.user.id });
    });

    // ── Whiteboard ─────────────────────────────────────────────────
    socket.on(EVENTS.WHITEBOARD_EVENT, ({ roomId, event }) => {
      const room = socket.currentRoom || roomId;
      const roomData = getOrCreateRoomDoc(room);

      if (event.type === 'add') {
        roomData.whiteboardState.push(event.shape);
      } else if (event.type === 'update') {
        const idx = roomData.whiteboardState.findIndex((s) => s.id === event.shape.id);
        if (idx !== -1) roomData.whiteboardState[idx] = event.shape;
      } else if (event.type === 'delete') {
        roomData.whiteboardState = roomData.whiteboardState.filter((s) => !(event.ids || []).includes(s.id));
      } else if (event.type === 'clear') {
        roomData.whiteboardState = [];
      } else if (event.type === 'set_state') {
        roomData.whiteboardState = event.shapes || [];
      }

      roomData.replayBuffer.push({
        type: 'whiteboard',
        userId: socket.user.id,
        userName: socket.user.name,
        data: event,
        timestamp: Date.now(),
      });
      if (roomData.replayBuffer.length >= 100) flushReplayBuffer(room, roomData);

      socket.to(room).emit(EVENTS.WHITEBOARD_EVENT, { event, userId: socket.user.id });
    });

    socket.on(EVENTS.WHITEBOARD_CLEAR, ({ roomId }) => {
      const room = socket.currentRoom || roomId;
      const roomData = getOrCreateRoomDoc(room);
      roomData.whiteboardState = [];
      io.to(room).emit(EVENTS.WHITEBOARD_CLEAR, { userId: socket.user.id });
    });

    // ── Yjs Editor ─────────────────────────────────────────────────
    socket.on(EVENTS.EDITOR_YJS_SYNC, ({ roomId, type, data }) => {
      const room = socket.currentRoom || roomId;
      const roomData = getOrCreateRoomDoc(room);
      const uint8 = new Uint8Array(data);

      if (type === 'sv') {
        const encoder = encoding.createEncoder();
        syncProtocol.writeSyncStep2(encoder, roomData.doc, uint8);
        const reply = encoding.toUint8Array(encoder);
        if (reply.length > 1) {
          socket.emit(EVENTS.EDITOR_YJS_SYNC, { type: 'update', data: Array.from(reply) });
        }
      } else if (type === 'update') {
        try {
          Y.applyUpdate(roomData.doc, uint8);
        } catch {}
        socket.to(room).emit(EVENTS.EDITOR_YJS_SYNC, { type: 'update', data });
      }
    });

    socket.on(EVENTS.EDITOR_YJS_UPDATE, ({ roomId, update }) => {
      const room = socket.currentRoom || roomId;
      const roomData = getOrCreateRoomDoc(room);
      try { Y.applyUpdate(roomData.doc, new Uint8Array(update)); } catch {}
      socket.to(room).emit(EVENTS.EDITOR_YJS_UPDATE, { update, userId: socket.user.id });
    });

    socket.on(EVENTS.EDITOR_YJS_AWARENESS, ({ roomId, update }) => {
      socket.to(roomId || socket.currentRoom).emit(EVENTS.EDITOR_YJS_AWARENESS, { update, userId: socket.user.id });
    });

    socket.on(EVENTS.EDITOR_LANGUAGE_CHANGE, ({ roomId, language }) => {
      socket.to(roomId || socket.currentRoom).emit(EVENTS.EDITOR_LANGUAGE_CHANGE, {
        language,
        userId: socket.user.id,
        name: socket.user.name,
      });
    });

    // ── Document Yjs Editor ───────────────────────────────────────
    socket.on('document:yjs:sync', ({ roomId, docId, type, data }) => {
      const room = socket.currentRoom || roomId;
      const doc = getOrCreateDocYjs(docId);
      const uint8 = new Uint8Array(data);

      if (type === 'sv') {
        const encoder = encoding.createEncoder();
        syncProtocol.writeSyncStep2(encoder, doc, uint8);
        const reply = encoding.toUint8Array(encoder);
        if (reply.length > 1) {
          socket.emit('document:yjs:sync', { docId, type: 'update', data: Array.from(reply) });
        }
      } else if (type === 'update') {
        try { Y.applyUpdate(doc, uint8); } catch {}
        socket.to(room).emit('document:yjs:sync', { docId, type: 'update', data });
      }
    });

    socket.on('document:yjs:update', ({ roomId, docId, update }) => {
      const room = socket.currentRoom || roomId;
      const doc = getOrCreateDocYjs(docId);
      try { Y.applyUpdate(doc, new Uint8Array(update)); } catch {}
      socket.to(room).emit('document:yjs:update', { docId, update, userId: socket.user.id });
    });

    // ── Document Annotations ──────────────────────────────────────
    socket.on('document:annot:sync', ({ roomId, docId }) => {
      const room = socket.currentRoom || roomId;
      const roomData = getOrCreateRoomDoc(room);
      if (!roomData.docAnnotations) roomData.docAnnotations = {};
      socket.emit('document:annot:sync', { docId, annotations: roomData.docAnnotations[docId] || {} });
    });

    socket.on('document:annot:update', ({ roomId, docId, pageNum, annotations }) => {
      const room = socket.currentRoom || roomId;
      const roomData = getOrCreateRoomDoc(room);
      if (!roomData.docAnnotations) roomData.docAnnotations = {};
      if (!roomData.docAnnotations[docId]) roomData.docAnnotations[docId] = {};
      roomData.docAnnotations[docId][pageNum] = annotations;
      socket.to(room).emit('document:annot:update', { docId, pageNum, newAnnotations: annotations, userId: socket.user.id });
    });

    // ── Chat ───────────────────────────────────────────────────────
    socket.on(EVENTS.CHAT_MESSAGE, async ({ roomId, content, type, replyTo }) => {
      try {
        const room = socket.currentRoom || roomId;
        const message = await chatService.createMessage(room, socket.user.id, { content, type, replyTo });
        io.to(room).emit(EVENTS.CHAT_MESSAGE, { message });
      } catch (err) {
        socket.emit(EVENTS.ERROR, { message: err.message });
      }
    });

    socket.on(EVENTS.CHAT_SEEN, ({ roomId }) => {
      chatService.markSeen(roomId || socket.currentRoom, socket.user.id).catch(() => {});
    });

    // ── WebRTC Signaling ───────────────────────────────────────────
    socket.on('webrtc:signal', ({ targetUserId, signal, isScreen }) => {
      const room = socket.currentRoom;
      if (!room) return;
      const roomData = roomDocs.get(room);
      if (!roomData) return;
      
      let targetSocketId = null;
      for (const [sId, user] of roomData.connectedUsers.entries()) {
        if (user.id === targetUserId) {
          targetSocketId = sId;
          break;
        }
      }
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc:signal', {
          senderUserId: socket.user.id,
          signal,
          isScreen
        });
      }
    });

    // ── Meetings & Activity ────────────────────────────────────────
    socket.on(EVENTS.MEETING_JOIN, ({ roomId }) => {
      const room = roomId || socket.currentRoom;
      if (room && roomDocs.has(room)) {
        roomDocs.get(room).meetingParticipants.add(socket.user.id);
      }
      socket.to(room).emit(EVENTS.MEETING_JOIN, { userId: socket.user.id, name: socket.user.name });
    });

    socket.on(EVENTS.MEETING_LEAVE, ({ roomId }) => {
      const room = roomId || socket.currentRoom;
      if (room && roomDocs.has(room)) {
        roomDocs.get(room).meetingParticipants.delete(socket.user.id);
      }
      socket.to(room).emit(EVENTS.MEETING_LEAVE, { userId: socket.user.id });
    });

    socket.on(EVENTS.SCREEN_SHARE_START, ({ roomId }) => {
      const room = roomId || socket.currentRoom;
      if (room && roomDocs.has(room)) {
        const roomData = roomDocs.get(room);
        // Only allow one screen sharer
        if (roomData.screenSharers.size > 0 && !roomData.screenSharers.has(socket.user.id)) {
          return socket.emit(EVENTS.ERROR, { message: 'Someone else is already sharing their screen.' });
        }
        roomData.screenSharers.add(socket.user.id);
      }
      socket.to(room).emit(EVENTS.SCREEN_SHARE_START, { userId: socket.user.id, name: socket.user.name });
    });

    socket.on(EVENTS.SCREEN_SHARE_STOP, ({ roomId }) => {
      const room = roomId || socket.currentRoom;
      if (room && roomDocs.has(room)) {
        roomDocs.get(room).screenSharers.delete(socket.user.id);
      }
      socket.to(room).emit(EVENTS.SCREEN_SHARE_STOP, { userId: socket.user.id });
    });

    socket.on(EVENTS.USER_ACTIVITY_CHANGE, ({ roomId, activity }) => {
      socket.to(roomId || socket.currentRoom).emit(EVENTS.USER_ACTIVITY_CHANGE, { userId: socket.user.id, activity });
    });

    // ── Live Preview Sync ─────────────────────────────────────────
    // When any user runs or auto-updates the HTML preview,
    // broadcast the rendered HTML to ALL participants in the room.
    socket.on(EVENTS.PREVIEW_SYNC, ({ roomId, html, triggeredBy }) => {
      const room = roomId || socket.currentRoom;
      if (!room) return;
      // Broadcast to everyone else in the room (not the sender)
      socket.to(room).emit(EVENTS.PREVIEW_SYNC, {
        html,
        triggeredBy: triggeredBy || socket.user.id,
        userName: socket.user.name,
        timestamp: Date.now(),
      });
    });

    // ── Code Execution Sync ───────────────────────────────────────
    socket.on(EVENTS.CODE_RUN, ({ roomId, language }) => {
      const room = roomId || socket.currentRoom;
      if (!room) return;
      socket.to(room).emit(EVENTS.CODE_RUN, {
        language,
        userId: socket.user.id,
        userName: socket.user.name,
      });
    });

    socket.on(EVENTS.CODE_OUTPUT, ({ roomId, output, language, executionTime }) => {
      const room = roomId || socket.currentRoom;
      if (!room) return;
      socket.to(room).emit(EVENTS.CODE_OUTPUT, {
        output,
        language,
        executionTime,
        userId: socket.user.id,
        userName: socket.user.name,
      });
    });

    // ── Disconnect ─────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🔌 Disconnected: ${socket.user?.name}`);
      try { await User.findByIdAndUpdate(socket.user?.id, { isOnline: false, lastSeen: new Date() }); } catch {}
      leaveRoom(socket, io);
    });
  });

  setInterval(() => {
    roomDocs.forEach((data, roomId) => {
      if (data.replayBuffer.length > 0) flushReplayBuffer(roomId, data);
    });
  }, 30000);

  return io;
}

async function flushReplayBuffer(roomId, roomData) {
  if (!roomData.sessionId || roomData.replayBuffer.length === 0) return;
  const events = [...roomData.replayBuffer];
  roomData.replayBuffer = [];
  try {
    await replayService.appendEvents(roomId, roomData.sessionId, events);
  } catch {}
}

function leaveRoom(socket, io) {
  if (!socket.currentRoom) return;
  const room = socket.currentRoom;
  const roomData = roomDocs.get(room);
  if (roomData) {
    const wasInMeeting = roomData.meetingParticipants.has(socket.user?.id);
    const wasSharing = roomData.screenSharers.has(socket.user?.id);
    
    roomData.connectedUsers.delete(socket.id);
    roomData.meetingParticipants.delete(socket.user?.id);
    roomData.screenSharers.delete(socket.user?.id);
    
    const members = Array.from(roomData.connectedUsers.values());
    socket.to(room).emit(EVENTS.USER_OFFLINE, { userId: socket.user?.id, members });
    
    if (wasInMeeting) {
      socket.to(room).emit(EVENTS.MEETING_LEAVE, { userId: socket.user?.id });
    }
    if (wasSharing) {
      socket.to(room).emit(EVENTS.SCREEN_SHARE_STOP, { userId: socket.user?.id });
    }
    
    socket.to(room).emit(EVENTS.NOTIFICATION, {
      type: 'user_left',
      message: `${socket.user?.name} left the room`,
      userId: socket.user?.id,
    });
    if (roomData.connectedUsers.size === 0) {
      setTimeout(async () => {
        const current = roomDocs.get(room);
        if (current && current.connectedUsers.size === 0) {
          try {
            // Persist state to DB before destroying
            const yjsState = Buffer.from(Y.encodeStateAsUpdate(current.doc));
            await Room.findByIdAndUpdate(room, {
              whiteboardState: current.whiteboardState,
              yjsState: yjsState
            });
            await flushReplayBuffer(room, current);
          } catch (err) {
            console.error('Error persisting room state:', err);
          } finally {
            roomDocs.delete(room);
          }
        }
      }, 5 * 60 * 1000); // 5 minutes grace period
    }
  }
  socket.leave(room);
  socket.currentRoom = null;
}

module.exports = { initializeSocket };
