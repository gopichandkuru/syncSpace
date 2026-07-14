const express = require('express');
const router = express.Router();
const roomController = require('../controllers/room.controller');
const { protect } = require('../middlewares/auth');
const { apiLimiter } = require('../middlewares/rateLimiter');

router.use(protect);

router.get('/', apiLimiter, roomController.getRooms);
router.get('/my', roomController.getMyRooms);
router.get('/invitations/pending', roomController.getPendingInvitations);
router.post('/', roomController.createRoom);
router.get('/slug/:slug', roomController.getRoomBySlug);
router.get('/invite/:token', roomController.acceptInvitation);
router.get('/:id', roomController.getRoomById);
router.patch('/:id', roomController.updateRoom);
router.delete('/:id', roomController.deleteRoom);
router.post('/:id/invite', roomController.inviteMember);
router.delete('/:id/members/:userId', roomController.kickMember);
router.post('/:id/transfer', roomController.transferOwnership);
router.post('/:id/sessions', roomController.createSession);
router.patch('/:id/sessions/:sessionId/end', roomController.endSession);
router.post('/:id/leave', roomController.leaveRoom);
router.get('/:id/sessions', roomController.getRoomSessions);

module.exports = router;
