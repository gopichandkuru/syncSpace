const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { protect } = require('../middlewares/auth');

router.use(protect);
router.get('/:roomId/messages', chatController.getMessages);
router.post('/:roomId/seen', chatController.markSeen);
router.get('/:roomId/unread', chatController.getUnreadCount);
router.delete('/messages/:id', chatController.deleteMessage);

module.exports = router;
