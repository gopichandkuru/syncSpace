const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const AppError = require('../utils/AppError');

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files are allowed (JPEG, PNG, WebP, GIF)', 400), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

const uploadToCloudinary = (buffer, folder, options = {}) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: `syncspace/${folder}`, resource_type: 'image', ...options },
      (error, result) => (error ? reject(error) : resolve(result))
    ).end(buffer);
  });

module.exports = { upload, uploadToCloudinary };
