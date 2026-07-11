const mongoose = require('mongoose');

const replayEventSchema = new mongoose.Schema({
  type: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  data: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Number, required: true },
}, { _id: false });

const replayHistorySchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  events: [replayEventSchema],
  totalDuration: { type: Number, default: 0 },
  eventCount: { type: Number, default: 0 },
  compressed: { type: Boolean, default: false },
}, { timestamps: true });

replayHistorySchema.index({ room: 1, session: 1 });

module.exports = mongoose.model('ReplayHistory', replayHistorySchema);
