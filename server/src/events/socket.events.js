const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Room
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_JOINED: 'room:joined',
  ROOM_LEFT: 'room:left',
  ROOM_MEMBERS: 'room:members',
  ROOM_ERROR: 'room:error',
  ROOM_SETTINGS_UPDATED: 'room:settings_updated',

  // Presence
  PRESENCE_UPDATE: 'presence:update',
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',

  // Cursor
  CURSOR_MOVE: 'cursor:move',
  CURSOR_LEAVE: 'cursor:leave',

  // Whiteboard
  WHITEBOARD_EVENT: 'whiteboard:event',
  WHITEBOARD_STATE: 'whiteboard:state',
  WHITEBOARD_CLEAR: 'whiteboard:clear',

  // Editor (Yjs)
  EDITOR_YJS_SYNC: 'editor:yjs:sync',
  EDITOR_YJS_UPDATE: 'editor:yjs:update',
  EDITOR_YJS_AWARENESS: 'editor:yjs:awareness',
  EDITOR_LANGUAGE_CHANGE: 'editor:language_change',

  // Chat
  CHAT_MESSAGE: 'chat:message',
  CHAT_MESSAGE_DELETED: 'chat:message_deleted',
  CHAT_SEEN: 'chat:seen',

  // Notifications
  NOTIFICATION: 'notification',

  // Replay
  REPLAY_EVENT: 'replay:event',
};

module.exports = SOCKET_EVENTS;
