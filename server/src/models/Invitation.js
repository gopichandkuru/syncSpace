const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  invitedEmail: { type: String, required: true, lowercase: true },
  invitedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  token: { type: String, required: true, unique: true },
  role: { type: String, enum: ['editor', 'viewer'], default: 'editor' },
  status: { type: String, enum: ['pending', 'accepted', 'declined', 'expired'], default: 'pending' },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

invitationSchema.index({ invitedEmail: 1 });
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Invitation', invitationSchema);
