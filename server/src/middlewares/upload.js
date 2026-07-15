const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const AppError = require('../utils/AppError');

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  // Allow images, pdfs, common docs, text
  const allowed = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'text/plain', 'text/markdown',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip', 'application/x-zip-compressed'
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Optionally allow all if needed, but let's restrict to common types
    cb(null, true); // Actually, allow all for "File Sharing" feature to be generic.
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

const uploadToCloudinary = (buffer, folder, options = {}) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: `syncspace/${folder}`, resource_type: options.resource_type || 'auto', ...options },
      (error, result) => (error ? reject(error) : resolve(result))
    ).end(buffer);
  });

module.exports = { upload, uploadToCloudinary };
