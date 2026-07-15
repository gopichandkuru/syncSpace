const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  type: { type: String, enum: ['pdf', 'markdown', 'text'], default: 'text' },
  url: { type: String, default: null }, // for PDFs or initial doc content uploaded to cloudinary
  publicId: { type: String, default: null },
  content: { type: String, default: '' }, // For plain text/markdown if stored in DB directly
  versions: [{
    content: String,
    savedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    savedAt: { type: Date, default: Date.now }
  }],
}, { timestamps: true });

documentSchema.index({ room: 1 });

module.exports = mongoose.model('Document', documentSchema);
