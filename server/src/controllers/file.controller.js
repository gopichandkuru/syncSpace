const File = require('../models/File');
const Room = require('../models/Room');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { uploadToCloudinary } = require('../middlewares/upload');
const cloudinary = require('../config/cloudinary');

exports.uploadFile = catchAsync(async (req, res, next) => {
  const { roomId } = req.body;
  
  const room = await Room.findById(roomId);
  if (!room) return next(new AppError('Room not found', 404));
  if (!room.isMember(req.user.id)) return next(new AppError('Access denied', 403));

  if (!req.file) return next(new AppError('No file provided', 400));

  // Auto resource type handles non-images well, but Cloudinary fails on PDFs with auto on free tiers.
  // We explicitly set it to 'raw' if it's not an image/video
  const isImage = req.file.mimetype.startsWith('image/') || req.file.mimetype.startsWith('video/');
  const resourceType = isImage ? 'auto' : 'raw';

  const result = await uploadToCloudinary(req.file.buffer, 'files', { 
    resource_type: resourceType,
    use_filename: true,
    unique_filename: true,
  });

  const file = await File.create({
    room: roomId,
    uploader: req.user.id,
    name: req.file.originalname,
    originalName: req.file.originalname,
    url: result.secure_url,
    publicId: result.public_id,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });

  const populatedFile = await file.populate('uploader', 'name avatar');

  const io = req.app.get('io');
  if (io) {
    io.to(roomId).emit('file:created', { file: populatedFile });
  }

  res.status(201).json({ status: 'success', data: { file: populatedFile } });
});

exports.getRoomFiles = catchAsync(async (req, res, next) => {
  const { roomId } = req.params;
  const room = await Room.findById(roomId);
  if (!room) return next(new AppError('Room not found', 404));
  if (!room.isMember(req.user.id)) return next(new AppError('Access denied', 403));

  const files = await File.find({ room: roomId })
    .populate('uploader', 'name avatar')
    .sort('-createdAt');

  res.status(200).json({ status: 'success', data: { files } });
});

exports.renameFile = catchAsync(async (req, res, next) => {
  const { name } = req.body;
  const file = await File.findById(req.params.id);
  if (!file) return next(new AppError('File not found', 404));

  const room = await Room.findById(file.room);
  if (!room || !room.isMember(req.user.id)) return next(new AppError('Access denied', 403));

  if (file.uploader.toString() !== req.user.id && room.owner.toString() !== req.user.id) {
    return next(new AppError('Only uploader or room owner can rename', 403));
  }

  file.name = name;
  await file.save();

  res.status(200).json({ status: 'success', data: { file } });
});

exports.deleteFile = catchAsync(async (req, res, next) => {
  const file = await File.findById(req.params.id);
  if (!file) return next(new AppError('File not found', 404));

  const room = await Room.findById(file.room);
  if (!room || !room.isMember(req.user.id)) return next(new AppError('Access denied', 403));

  if (file.uploader.toString() !== req.user.id && room.owner.toString() !== req.user.id) {
    return next(new AppError('Only uploader or room owner can delete', 403));
  }

  // Delete from cloudinary
  if (file.publicId) {
    try {
      await cloudinary.uploader.destroy(file.publicId, { resource_type: file.mimetype.startsWith('image') ? 'image' : 'raw' });
    } catch(err) {
      console.warn("Failed to delete from cloudinary", err);
    }
  }

  await File.findByIdAndDelete(req.params.id);
  res.status(204).json({ status: 'success', data: null });
});
