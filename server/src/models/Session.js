const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null },
  duration: { type: Number, default: 0 },
  whiteboardSnapshot: { type: mongoose.Schema.Types.ObjectId, ref: 'WhiteboardSnapshot', default: null },
  editorSnapshot: { type: String, default: '' },
  editorLanguage: { type: String, default: 'javascript' },
  eventCount: { type: Number, default: 0 },
}, { timestamps: true });

sessionSchema.index({ room: 1, startedAt: -1 });

module.exports = mongoose.model('Session', sessionSchema);
