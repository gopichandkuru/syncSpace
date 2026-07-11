const chatService = require('../services/chat.service');
const catchAsync = require('../utils/catchAsync');

const getMessages = catchAsync(async (req, res) => {
  const messages = await chatService.getMessages(req.params.roomId, req.user.id, req.query);
  res.json({ success: true, data: { messages } });
});

const deleteMessage = catchAsync(async (req, res) => {
  const message = await chatService.deleteMessage(req.params.id, req.user.id);
  res.json({ success: true, data: { message } });
});

const markSeen = catchAsync(async (req, res) => {
  await chatService.markSeen(req.params.roomId, req.user.id);
  res.json({ success: true });
});

const getUnreadCount = catchAsync(async (req, res) => {
  const count = await chatService.getUnreadCount(req.params.roomId, req.user.id);
  res.json({ success: true, data: { count } });
});

module.exports = { getMessages, deleteMessage, markSeen, getUnreadCount };
