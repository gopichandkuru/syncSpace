const ReplayHistory = require('../models/ReplayHistory');
const WhiteboardSnapshot = require('../models/WhiteboardSnapshot');
const Room = require('../models/Room');
const Session = require('../models/Session');
const AppError = require('../utils/AppError');
const cloudinary = require('../config/cloudinary');

class ReplayService {
  async getReplay(roomId, sessionId, userId) {
    const room = await Room.findById(roomId);
    if (!room) throw new AppError('Room not found', 404);
    const isMember = room.members.some((m) => m.user.toString() === userId.toString());
    if (!isMember) throw new AppError('Access denied', 403);

    const replay = await ReplayHistory.findOne({ room: roomId, session: sessionId })
      .populate('events.userId', 'name avatar');

    if (!replay) throw new AppError('No replay data found for this session', 404);
    return replay;
  }

  async appendEvents(roomId, sessionId, events) {
    const timestampedEvents = events.map((e) => ({ ...e, timestamp: e.timestamp || Date.now() }));
    return ReplayHistory.findOneAndUpdate(
      { room: roomId, session: sessionId },
      {
        $push: { events: { $each: timestampedEvents } },
        $inc: { eventCount: timestampedEvents.length },
        $set: { totalDuration: timestampedEvents[timestampedEvents.length - 1]?.timestamp || 0 },
      },
      { upsert: true, new: true }
    );
  }

  async saveSnapshot(roomId, sessionId, userId, { imageBuffer, canvasData, width, height }) {
    const result = await cloudinary.uploader.upload_stream(
      { folder: 'syncspace/snapshots', resource_type: 'image' },
      async (error, uploadResult) => {
        if (error) throw error;
        return WhiteboardSnapshot.create({
          room: roomId,
          session: sessionId,
          savedBy: userId,
          imageUrl: uploadResult.secure_url,
          imagePublicId: uploadResult.public_id,
          canvasData,
          width,
          height,
          elementCount: Array.isArray(canvasData?.shapes) ? canvasData.shapes.length : 0,
        });
      }
    );
    return result;
  }

  async getSnapshots(roomId, userId) {
    const room = await Room.findById(roomId);
    if (!room) throw new AppError('Room not found', 404);
    const isMember = room.members.some((m) => m.user.toString() === userId.toString());
    if (!isMember) throw new AppError('Access denied', 403);

    return WhiteboardSnapshot.find({ room: roomId })
      .populate('savedBy', 'name avatar')
      .populate('session', 'startedAt endedAt')
      .sort({ createdAt: -1 })
      .limit(20);
  }
}

module.exports = new ReplayService();
