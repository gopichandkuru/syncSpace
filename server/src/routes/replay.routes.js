const express = require('express');
const router = express.Router();
const replayController = require('../controllers/replay.controller');
const { protect } = require('../middlewares/auth');

router.use(protect);
router.get('/:roomId/sessions/:sessionId', replayController.getReplay);
router.get('/:roomId/snapshots', replayController.getSnapshots);

module.exports = router;
