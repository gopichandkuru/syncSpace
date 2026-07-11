const roomService = require('../services/room.service');
const catchAsync = require('../utils/catchAsync');

const createRoom = catchAsync(async (req, res) => {
  const room = await roomService.createRoom(req.user.id, req.body);
  res.status(201).json({ success: true, data: { room } });
});

const getRooms = catchAsync(async (req, res) => {
  const result = await roomService.getRooms(req.query);
  res.json({ success: true, data: result });
});

const getMyRooms = catchAsync(async (req, res) => {
  const rooms = await roomService.getUserRooms(req.user.id);
  res.json({ success: true, data: { rooms } });
});

const getRoomById = catchAsync(async (req, res) => {
  const room = await roomService.getRoomById(req.params.id, req.user.id);
  res.json({ success: true, data: { room } });
});

const getRoomBySlug = catchAsync(async (req, res) => {
  const room = await roomService.getRoomBySlug(req.params.slug, req.user.id);
  res.json({ success: true, data: { room } });
});

const updateRoom = catchAsync(async (req, res) => {
  const room = await roomService.updateRoom(req.params.id, req.user.id, req.body);
  res.json({ success: true, data: { room } });
});

const deleteRoom = catchAsync(async (req, res) => {
  await roomService.deleteRoom(req.params.id, req.user.id);
  res.json({ success: true, message: 'Room deleted' });
});

const inviteMember = catchAsync(async (req, res) => {
  const invitation = await roomService.inviteMember(req.params.id, req.user.id, req.body);
  res.status(201).json({ success: true, data: { invitation } });
});

const acceptInvitation = catchAsync(async (req, res) => {
  const room = await roomService.acceptInvitation(req.params.token, req.user.id);
  res.json({ success: true, data: { room } });
});

const kickMember = catchAsync(async (req, res) => {
  await roomService.kickMember(req.params.id, req.user.id, req.params.userId);
  res.json({ success: true, message: 'Member removed' });
});

const transferOwnership = catchAsync(async (req, res) => {
  await roomService.transferOwnership(req.params.id, req.user.id, req.body.newOwnerId);
  res.json({ success: true, message: 'Ownership transferred' });
});

const createSession = catchAsync(async (req, res) => {
  const session = await roomService.createSession(req.params.id, req.user.id);
  res.status(201).json({ success: true, data: { session } });
});

const endSession = catchAsync(async (req, res) => {
  const session = await roomService.endSession(req.params.sessionId, req.user.id);
  res.json({ success: true, data: { session } });
});

const getRoomSessions = catchAsync(async (req, res) => {
  const sessions = await roomService.getRoomSessions(req.params.id, req.user.id);
  res.json({ success: true, data: { sessions } });
});

module.exports = {
  createRoom, getRooms, getMyRooms, getRoomById, getRoomBySlug,
  updateRoom, deleteRoom, inviteMember, acceptInvitation,
  kickMember, transferOwnership, createSession, endSession, getRoomSessions,
};
