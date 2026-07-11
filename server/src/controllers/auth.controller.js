const authService = require('../services/auth.service');
const { REFRESH_COOKIE_OPTIONS } = require('../config/jwt');
const catchAsync = require('../utils/catchAsync');

const register = catchAsync(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.register(req.body);
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(201).json({ success: true, data: { user, accessToken } });
});

const login = catchAsync(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
  res.json({ success: true, data: { user, accessToken } });
});

const logout = catchAsync(async (req, res) => {
  const token = req.cookies.refreshToken;
  await authService.logout(req.user.id, token);
  res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);
  res.json({ success: true, message: 'Logged out successfully' });
});

const refreshToken = catchAsync(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ success: false, message: 'No refresh token' });
  const { accessToken, refreshToken: newRefresh } = await authService.refreshAccessToken(token);
  res.cookie('refreshToken', newRefresh, REFRESH_COOKIE_OPTIONS);
  res.json({ success: true, data: { accessToken } });
});

const verifyEmail = catchAsync(async (req, res) => {
  const user = await authService.verifyEmail(req.params.token);
  res.json({ success: true, message: 'Email verified successfully', data: { user } });
});

const forgotPassword = catchAsync(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  res.json({ success: true, message: 'If that email exists, a reset link has been sent' });
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.params.token, req.body.password);
  res.json({ success: true, message: 'Password reset successfully' });
});

const getMe = catchAsync(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  res.json({ success: true, data: { user } });
});

module.exports = { register, login, logout, refreshToken, verifyEmail, forgotPassword, resetPassword, getMe };
