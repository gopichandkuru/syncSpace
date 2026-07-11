const User = require('../models/User');
const Room = require('../models/Room');
const ActivityLog = require('../models/ActivityLog');
const AppError = require('../utils/AppError');
const { uploadToCloudinary } = require('../middlewares/upload');
const cloudinary = require('../config/cloudinary');

class UserService {
  async getProfile(userId) {
    const user = await User.findById(userId).populate('rooms', 'name slug type lastActivity');
    if (!user) throw new AppError('User not found', 404);
    return user.toPublicJSON();
  }

  async updateProfile(userId, data, file) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    if (data.name) user.name = data.name;
    if (data.notificationPreferences) user.notificationPreferences = { ...user.notificationPreferences, ...data.notificationPreferences };

    if (file) {
      if (user.avatarPublicId) {
        try { await cloudinary.uploader.destroy(user.avatarPublicId); } catch {}
      }
      const result = await uploadToCloudinary(file.buffer, 'avatars', { transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face' }] });
      user.avatar = result.secure_url;
      user.avatarPublicId = result.public_id;
    }

    await user.save();
    return user.toPublicJSON();
  }

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await User.findById(userId).select('+password');
    if (!user) throw new AppError('User not found', 404);
    if (!(await user.comparePassword(currentPassword))) throw new AppError('Current password is incorrect', 401);
    user.password = newPassword;
    await user.save();
  }

  async getActivityLog(userId, { page = 1, limit = 20 } = {}) {
    const skip = (Number(page) - 1) * Number(limit);
    return ActivityLog.find({ user: userId })
      .populate('room', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
  }

  async searchUsers(query) {
    if (!query || query.length < 2) return [];
    return User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    }).select('name email avatar isOnline').limit(10);
  }
}

module.exports = new UserService();
