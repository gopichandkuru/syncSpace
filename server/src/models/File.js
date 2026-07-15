const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  originalName: { type: String, required: true },
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  size: { type: Number, required: true }, // in bytes
  mimetype: { type: String, required: true },
}, { timestamps: true });

fileSchema.index({ room: 1 });

module.exports = mongoose.model('File', fileSchema);
