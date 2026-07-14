import api from './api';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, data) => api.post(`/auth/reset-password/${token}`, data),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
};

export const userService = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => {
    const form = new FormData();
    Object.entries(data).forEach(([k, v]) => v !== undefined && form.append(k, v));
    return api.patch('/users/profile', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  changePassword: (data) => api.patch('/users/change-password', data),
  getActivityLog: (params) => api.get('/users/activity', { params }),
  searchUsers: (q) => api.get('/users/search', { params: { q } }),
};

export const roomService = {
  create: (data) => api.post('/rooms', data),
  getAll: (params) => api.get('/rooms', { params }),
  getMy: () => api.get('/rooms/my'),
  getById: (id) => api.get(`/rooms/${id}`),
  getBySlug: (slug) => api.get(`/rooms/slug/${slug}`),
  update: (id, data) => api.patch(`/rooms/${id}`, data),
  delete: (id) => api.delete(`/rooms/${id}`),
  invite: (id, data) => api.post(`/rooms/${id}/invite`, data),
  acceptInvitation: (token) => api.get(`/rooms/invite/${token}`),
  kickMember: (roomId, userId) => api.delete(`/rooms/${roomId}/members/${userId}`),
  transferOwnership: (roomId, newOwnerId) => api.post(`/rooms/${roomId}/transfer`, { newOwnerId }),
  createSession: (id) => api.post(`/rooms/${id}/sessions`),
  endSession: (id, sessionId) => api.patch(`/rooms/${id}/sessions/${sessionId}/end`),
  getSessions: (id) => api.get(`/rooms/${id}/sessions`),
  getPendingInvitations: () => api.get('/rooms/invitations/pending'),
  leave: (id) => api.post(`/rooms/${id}/leave`),
};

export const chatService = {
  getMessages: (roomId, params) => api.get(`/chat/${roomId}/messages`, { params }),
  deleteMessage: (id) => api.delete(`/chat/messages/${id}`),
  markSeen: (roomId) => api.post(`/chat/${roomId}/seen`),
  getUnreadCount: (roomId) => api.get(`/chat/${roomId}/unread`),
};

export const replayService = {
  getReplay: (roomId, sessionId) => api.get(`/replay/${roomId}/sessions/${sessionId}`),
  getSnapshots: (roomId) => api.get(`/replay/${roomId}/snapshots`),
};
