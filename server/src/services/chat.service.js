const ChatMessage = require('../models/ChatMessage');
const Room = require('../models/Room');
const AppError = require('../utils/AppError');

class ChatService {
  async getMessages(roomId, userId, { page = 1, limit = 50 } = {}) {
    const room = await Room.findById(roomId);
    if (!room) throw new AppError('Room not found', 404);
    const isMember = room.members.some((m) => m.user.toString() === userId.toString());
    if (!isMember) throw new AppError('Access denied', 403);

    const skip = (Number(page) - 1) * Number(limit);
    const messages = await ChatMessage.find({ room: roomId, isDeleted: false })
      .populate('sender', 'name avatar')
      .populate({ path: 'replyTo', populate: { path: 'sender', select: 'name' } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return messages.reverse();
  }

  async createMessage(roomId, senderId, { content, type = 'text', replyTo }) {
    const message = await ChatMessage.create({ room: roomId, sender: senderId, content, type, replyTo: replyTo || null });
    await Room.findByIdAndUpdate(roomId, { lastActivity: new Date() });
    return message.populate([
      { path: 'sender', select: 'name avatar' },
      { path: 'replyTo', populate: { path: 'sender', select: 'name' } },
    ]);
  }

  async deleteMessage(messageId, userId) {
    const message = await ChatMessage.findById(messageId);
    if (!message) throw new AppError('Message not found', 404);
    if (message.sender.toString() !== userId.toString()) throw new AppError('Can only delete own messages', 403);

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = '[Message deleted]';
    await message.save();
    return message;
  }

  async markSeen(roomId, userId) {
    await ChatMessage.updateMany(
      { room: roomId, seenBy: { $ne: userId }, sender: { $ne: userId } },
      { $addToSet: { seenBy: userId } }
    );
  }

  async getUnreadCount(roomId, userId) {
    return ChatMessage.countDocuments({ room: roomId, seenBy: { $ne: userId }, sender: { $ne: userId }, isDeleted: false });
  }
}

module.exports = new ChatService();
