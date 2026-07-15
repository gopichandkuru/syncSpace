const Document = require('../models/Document');
const Room = require('../models/Room');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { uploadToCloudinary } = require('../middlewares/upload');

exports.createDocument = catchAsync(async (req, res, next) => {
  const { roomId, title, type, content } = req.body; // type can be 'markdown', 'text', 'pdf'
  
  const room = await Room.findById(roomId);
  if (!room) return next(new AppError('Room not found', 404));
  if (!room.isMember(req.user.id)) return next(new AppError('Access denied', 403));

  let url = null;
  let publicId = null;
  let docContent = content || '';
  let docType = type || 'text';

  // If a file is uploaded
  if (req.file) {
    if (req.file.mimetype === 'application/pdf') {
      docType = 'pdf';
      const result = await uploadToCloudinary(req.file.buffer, 'documents', { resource_type: 'image', format: 'pdf' });
      url = result.secure_url;
      publicId = result.public_id;
    } else if (req.file.mimetype.includes('text') || req.file.mimetype.includes('markdown')) {
      docType = req.file.mimetype.includes('markdown') || req.file.originalname.endsWith('.md') ? 'markdown' : 'text';
      docContent = req.file.buffer.toString('utf-8');
    } else {
      // General fallback to Cloudinary raw
      const result = await uploadToCloudinary(req.file.buffer, 'documents', { resource_type: 'raw' });
      url = result.secure_url;
      publicId = result.public_id;
    }
  }

  const document = await Document.create({
    room: roomId,
    creator: req.user.id,
    title: title || (req.file ? req.file.originalname : 'Untitled Document'),
    type: docType,
    url,
    publicId,
    content: docContent,
    versions: docContent ? [{ content: docContent, savedBy: req.user.id }] : []
  });

  res.status(201).json({ status: 'success', data: { document } });
});

exports.getRoomDocuments = catchAsync(async (req, res, next) => {
  const { roomId } = req.params;
  const room = await Room.findById(roomId);
  if (!room) return next(new AppError('Room not found', 404));
  if (!room.isMember(req.user.id)) return next(new AppError('Access denied', 403));

  const documents = await Document.find({ room: roomId })
    .select('-versions') // Don't send all versions in list
    .populate('creator', 'name avatar')
    .sort('-createdAt');

  res.status(200).json({ status: 'success', data: { documents } });
});

exports.getDocument = catchAsync(async (req, res, next) => {
  const document = await Document.findById(req.params.id)
    .populate('creator', 'name avatar')
    .populate('versions.savedBy', 'name avatar');
    
  if (!document) return next(new AppError('Document not found', 404));
  
  const room = await Room.findById(document.room);
  if (!room || !room.isMember(req.user.id)) return next(new AppError('Access denied', 403));

  res.status(200).json({ status: 'success', data: { document } });
});

exports.saveVersion = catchAsync(async (req, res, next) => {
  const { content } = req.body;
  const document = await Document.findById(req.params.id);
  if (!document) return next(new AppError('Document not found', 404));

  const room = await Room.findById(document.room);
  if (!room || !room.isMember(req.user.id)) return next(new AppError('Access denied', 403));

  document.content = content;
  document.versions.push({ content, savedBy: req.user.id, savedAt: Date.now() });
  await document.save();

  res.status(200).json({ status: 'success', data: { document } });
});

exports.deleteDocument = catchAsync(async (req, res, next) => {
  const document = await Document.findById(req.params.id);
  if (!document) return next(new AppError('Document not found', 404));

  const room = await Room.findById(document.room);
  if (!room || (!room.isMember(req.user.id) && room.owner.toString() !== req.user.id)) {
    return next(new AppError('Access denied', 403));
  }

  // Admin/owner or creator can delete
  if (document.creator.toString() !== req.user.id && room.owner.toString() !== req.user.id) {
    return next(new AppError('Only creator or room owner can delete', 403));
  }

  await Document.findByIdAndDelete(req.params.id);
  res.status(204).json({ status: 'success', data: null });
});
