const mongoose = require('mongoose');

const whiteboardSnapshotSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
  savedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl: { type: String, required: true },
  imagePublicId: { type: String, required: true },
  canvasData: { type: mongoose.Schema.Types.Mixed, default: {} },
  width: { type: Number, default: 1920 },
  height: { type: Number, default: 1080 },
  elementCount: { type: Number, default: 0 },
}, { timestamps: true });

whiteboardSnapshotSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model('WhiteboardSnapshot', whiteboardSnapshotSchema);
