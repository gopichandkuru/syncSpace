const crypto = require('crypto');
const Room = require('../models/Room');
const User = require('../models/User');
const Invitation = require('../models/Invitation');
const Session = require('../models/Session');
const ActivityLog = require('../models/ActivityLog');
const { sendMail, emailTemplates } = require('../config/mailer');
const AppError = require('../utils/AppError');

class RoomService {
  async createRoom(userId, data) {
    const { name, description, type, password, activeMode, settings } = data;
    const room = await Room.create({
      name,
      description,
      type: type || 'private',
      password: password || null,
      activeMode: activeMode || 'both',
      settings,
      owner: userId,
      members: [{ user: userId, role: 'owner' }],
    });

    await User.findByIdAndUpdate(userId, { $addToSet: { rooms: room._id } });
    await ActivityLog.create({ user: userId, room: room._id, action: 'room_created', details: { name } });

    return room.populate('owner', 'name email avatar');
  }

  async getRooms(query = {}) {
    const { page = 1, limit = 20, search, type } = query;
    const filter = { isActive: true };
    if (type) filter.type = type;
    else filter.type = 'public';
    if (search) filter.name = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const [rooms, total] = await Promise.all([
      Room.find(filter)
        .populate('owner', 'name avatar')
        .populate('members.user', 'name avatar isOnline')
        .sort({ lastActivity: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Room.countDocuments(filter),
    ]);

    return { rooms, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  async getRoomById(roomId, userId) {
    const room = await Room.findById(roomId)
      .populate('owner', 'name email avatar isOnline')
      .populate('members.user', 'name email avatar isOnline lastSeen');

    if (!room || !room.isActive) throw new AppError('Room not found', 404);

    const isMember = room.members.some((m) => m.user._id.toString() === userId.toString());
    if (!isMember && room.type !== 'public') throw new AppError('Access denied', 403);

    return room;
  }

  async getRoomBySlug(slug, userId) {
    const room = await Room.findOne({ slug, isActive: true })
      .populate('owner', 'name email avatar isOnline')
      .populate('members.user', 'name email avatar isOnline lastSeen');

    if (!room) throw new AppError('Room not found', 404);

    const isMember = room.members.some((m) => m.user._id.toString() === userId.toString());
    if (!isMember && room.type !== 'public') throw new AppError('Access denied', 403);

    return room;
  }

  async updateRoom(roomId, userId, data) {
    const room = await Room.findById(roomId);
    if (!room) throw new AppError('Room not found', 404);

    const member = room.members.find((m) => m.user.toString() === userId.toString());
    if (!member || !['owner', 'editor'].includes(member.role)) {
      throw new AppError('Permission denied', 403);
    }

    const allowed = ['name', 'description', 'type', 'activeMode', 'settings'];
    allowed.forEach((field) => { if (data[field] !== undefined) room[field] = data[field]; });

    await room.save();
    return room.populate('owner', 'name avatar').populate('members.user', 'name avatar isOnline');
  }

  async deleteRoom(roomId, userId) {
    const room = await Room.findById(roomId);
    if (!room) throw new AppError('Room not found', 404);
    if (room.owner.toString() !== userId.toString()) throw new AppError('Only owner can delete room', 403);

    room.isActive = false;
    await room.save();
    await User.updateMany({ rooms: roomId }, { $pull: { rooms: roomId } });
    await ActivityLog.create({ user: userId, room: roomId, action: 'room_deleted' });
  }

  async inviteMember(roomId, userId, { email, role }) {
    const room = await Room.findById(roomId).populate('owner', 'name');
    if (!room) throw new AppError('Room not found', 404);

    const requester = room.members.find((m) => m.user.toString() === userId.toString());
    if (!requester || !['owner', 'editor'].includes(requester.role)) throw new AppError('Permission denied', 403);

    const existingInvite = await Invitation.findOne({ room: roomId, invitedEmail: email, status: 'pending' });
    if (existingInvite) throw new AppError('Invitation already sent to this email', 409);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitedUser = await User.findOne({ email });

    const invitation = await Invitation.create({
      room: roomId,
      invitedBy: userId,
      invitedEmail: email,
      invitedUser: invitedUser?._id || null,
      token,
      role: role || 'editor',
      expiresAt,
    });

    const inviter = await User.findById(userId);
    const link = `${process.env.CLIENT_URL}/invite/${token}`;
    const { subject, html } = emailTemplates.roomInvitation(invitedUser?.name || email, room.name, inviter.name, link);
    // Fire-and-forget: invitation is saved regardless of email delivery
    sendMail({ to: email, subject, html }).catch(() => {});

    return invitation;
  }

  async acceptInvitation(token, userId) {
    const invitation = await Invitation.findOne({ token, status: 'pending' });
    if (!invitation || invitation.expiresAt < new Date()) {
      if (invitation) { invitation.status = 'expired'; await invitation.save(); }
      throw new AppError('Invitation is invalid or expired', 400);
    }

    const room = await Room.findById(invitation.room);
    if (!room) throw new AppError('Room no longer exists', 404);

    const alreadyMember = room.members.some((m) => m.user.toString() === userId.toString());
    if (!alreadyMember) {
      room.members.push({ user: userId, role: invitation.role });
      await room.save();
      await User.findByIdAndUpdate(userId, { $addToSet: { rooms: room._id } });
    }

    invitation.status = 'accepted';
    invitation.invitedUser = userId;
    await invitation.save();

    return room;
  }

  async kickMember(roomId, ownerId, targetUserId) {
    const room = await Room.findById(roomId);
    if (!room) throw new AppError('Room not found', 404);
    if (room.owner.toString() !== ownerId.toString()) throw new AppError('Only owner can kick members', 403);
    if (targetUserId === ownerId.toString()) throw new AppError('Owner cannot kick themselves', 400);

    room.members = room.members.filter((m) => m.user.toString() !== targetUserId);
    await room.save();
    await User.findByIdAndUpdate(targetUserId, { $pull: { rooms: roomId } });
    await ActivityLog.create({ user: ownerId, room: roomId, action: 'member_kicked', details: { targetUserId } });
  }

  async transferOwnership(roomId, currentOwnerId, newOwnerId) {
    const room = await Room.findById(roomId);
    if (!room) throw new AppError('Room not found', 404);
    if (room.owner.toString() !== currentOwnerId.toString()) throw new AppError('Only owner can transfer', 403);

    const newOwnerMember = room.members.find((m) => m.user.toString() === newOwnerId);
    if (!newOwnerMember) throw new AppError('New owner must be a room member', 400);

    newOwnerMember.role = 'owner';
    const currentOwnerMember = room.members.find((m) => m.user.toString() === currentOwnerId.toString());
    if (currentOwnerMember) currentOwnerMember.role = 'editor';
    room.owner = newOwnerId;
    await room.save();
  }

  async getUserRooms(userId) {
    return Room.find({ 'members.user': userId, isActive: true })
      .populate('owner', 'name avatar')
      .populate('members.user', 'name avatar isOnline')
      .sort({ lastActivity: -1 });
  }

  async createSession(roomId, userId) {
    const session = await Session.create({ room: roomId, startedBy: userId, participants: [userId] });
    await Room.findByIdAndUpdate(roomId, { lastActivity: new Date() });
    return session;
  }

  async endSession(sessionId, userId) {
    const session = await Session.findById(sessionId);
    if (!session) throw new AppError('Session not found', 404);
    session.endedAt = new Date();
    session.duration = Math.floor((session.endedAt - session.startedAt) / 1000);
    await session.save();
    return session;
  }

  async getRoomSessions(roomId, userId) {
    const room = await Room.findById(roomId);
    if (!room) throw new AppError('Room not found', 404);
    const isMember = room.members.some((m) => m.user.toString() === userId.toString());
    if (!isMember) throw new AppError('Access denied', 403);

    return Session.find({ room: roomId })
      .populate('startedBy', 'name avatar')
      .populate('participants', 'name avatar')
      .sort({ startedAt: -1 })
      .limit(50);
  }
  
  async leaveRoom(roomId, userId) {
    const room = await Room.findById(roomId);
    if (!room) throw new AppError('Room not found', 404);
    if (room.owner.toString() === userId.toString()) {
      throw new AppError('Owner cannot leave without transferring ownership or deleting the workspace', 400);
    }
    room.members = room.members.filter((m) => m.user.toString() !== userId.toString());
    await room.save();
    await User.findByIdAndUpdate(userId, { $pull: { rooms: roomId } });
    await ActivityLog.create({ user: userId, room: roomId, action: 'member_left' });
  }
  async getPendingInvitations(userId) {
    const user = await User.findById(userId).select('email');
    if (!user) return [];
    return Invitation.find({ invitedEmail: user.email, status: 'pending', expiresAt: { $gt: new Date() } })
      .populate('room', 'name slug type')
      .populate('invitedBy', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(20);
  }
}

module.exports = new RoomService();
