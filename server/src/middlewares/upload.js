const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const AppError = require('../utils/AppError');

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowed = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/x-pdf',
    'text/plain', 'text/markdown',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip', 'application/x-zip-compressed'
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // We want to be permissive but explicitly log unknown types
    console.warn('Unknown mimetype uploaded:', file.mimetype);
    cb(null, true); 
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 100 * 1024 * 1024 } });

const uploadToCloudinary = (buffer, folder, options = {}) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: `syncspace/${folder}`, resource_type: options.resource_type || 'auto', ...options },
      (error, result) => (error ? reject(error) : resolve(result))
    ).end(buffer);
  });

module.exports = { upload, uploadToCloudinary };
