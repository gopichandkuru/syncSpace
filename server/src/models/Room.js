const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'editor' },
  joinedAt: { type: Date, default: Date.now },
  isMuted: { type: Boolean, default: false },
}, { _id: false });

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  slug: { type: String, unique: true, default: () => uuidv4().slice(0, 8) },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [memberSchema],
  type: { type: String, enum: ['public', 'private', 'invite-only'], default: 'private' },
  password: { type: String, select: false, default: null },
  isActive: { type: Boolean, default: true },
  activeMode: { type: String, enum: ['whiteboard', 'editor', 'both'], default: 'both' },
  settings: {
    allowGuestAccess: { type: Boolean, default: false },
    maxMembers: { type: Number, default: 50 },
    enableChat: { type: Boolean, default: true },
    enableReplay: { type: Boolean, default: true },
  },
  thumbnail: { type: String, default: null },
  lastActivity: { type: Date, default: Date.now },
}, { timestamps: true });

roomSchema.index({ owner: 1 });
roomSchema.index({ type: 1, isActive: 1 });

roomSchema.methods.isMember = function (userId) {
  return this.members.some((m) => m.user.toString() === userId.toString());
};

roomSchema.methods.getMemberRole = function (userId) {
  const member = this.members.find((m) => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

module.exports = mongoose.model('Room', roomSchema);
