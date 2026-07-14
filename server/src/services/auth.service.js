const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../config/jwt');
const { sendMail, emailTemplates } = require('../config/mailer');
const AppError = require('../utils/AppError');

class AuthService {
  async register({ name, email, password }) {
    const existing = await User.findOne({ email });
    if (existing) throw new AppError('Email already registered', 409);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await User.create({
      name,
      email,
      password,
      emailVerificationToken: crypto.createHash('sha256').update(verificationToken).digest('hex'),
      emailVerificationExpires: verificationExpires,
    });

    const verifyLink = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
    const { subject, html } = emailTemplates.verifyEmail(user.name, verifyLink);

    // Fire-and-forget: do NOT await email — respond to user instantly
    // SMTP failure must never block registration
    sendMail({ to: email, subject, html }).catch(() => {});

    const accessToken = generateAccessToken({ id: user._id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user._id });

    await User.findByIdAndUpdate(user._id, { $push: { refreshTokens: refreshToken } });

    return { user: user.toPublicJSON(), accessToken, refreshToken };
  }

  async login({ email, password, rememberMe }) {
    const user = await User.findOne({ email }).select('+password +refreshTokens');
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError('Invalid email or password', 401);
    }

    const accessToken = generateAccessToken({ id: user._id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user._id });

    user.refreshTokens = (user.refreshTokens || []).slice(-9);
    user.refreshTokens.push(refreshToken);
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    await ActivityLog.create({ user: user._id, action: 'login', details: { rememberMe } });

    return { user: user.toPublicJSON(), accessToken, refreshToken };
  }

  async logout(userId, refreshToken) {
    await User.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: refreshToken },
      isOnline: false,
      lastSeen: new Date(),
    });
  }

  async refreshAccessToken(token) {
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      throw new AppError('Invalid refresh token', 401);
    }

    const user = await User.findById(decoded.id).select('+refreshTokens');
    if (!user || !user.refreshTokens.includes(token)) {
      throw new AppError('Refresh token not found', 401);
    }

    const newAccessToken = generateAccessToken({ id: user._id, role: user.role });
    const newRefreshToken = generateRefreshToken({ id: user._id });

    user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async verifyEmail(token) {
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashed,
      emailVerificationExpires: { $gt: Date.now() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) throw new AppError('Invalid or expired verification link', 400);

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return user.toPublicJSON();
  }

  async forgotPassword(email) {
    const user = await User.findOne({ email });
    if (!user) return;

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    const { subject, html } = emailTemplates.resetPassword(user.name, resetLink);
    await sendMail({ to: email, subject, html });
  }

  async resetPassword(token, newPassword) {
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires +refreshTokens');

    if (!user) throw new AppError('Invalid or expired reset link', 400);

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens = [];
    await user.save();
  }

  async getMe(userId) {
    const user = await User.findById(userId).populate('rooms', 'name slug type');
    if (!user) throw new AppError('User not found', 404);
    return user.toPublicJSON();
  }
}

module.exports = new AuthService();
