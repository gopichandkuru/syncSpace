const userService = require('../services/user.service');
const catchAsync = require('../utils/catchAsync');

const getProfile = catchAsync(async (req, res) => {
  const user = await userService.getProfile(req.user.id);
  res.json({ success: true, data: { user } });
});

const updateProfile = catchAsync(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body, req.file);
  res.json({ success: true, data: { user } });
});

const changePassword = catchAsync(async (req, res) => {
  await userService.changePassword(req.user.id, req.body);
  res.json({ success: true, message: 'Password changed successfully' });
});

const getActivityLog = catchAsync(async (req, res) => {
  const logs = await userService.getActivityLog(req.user.id, req.query);
  res.json({ success: true, data: { logs } });
});

const searchUsers = catchAsync(async (req, res) => {
  const users = await userService.searchUsers(req.query.q);
  res.json({ success: true, data: { users } });
});

module.exports = { getProfile, updateProfile, changePassword, getActivityLog, searchUsers };
