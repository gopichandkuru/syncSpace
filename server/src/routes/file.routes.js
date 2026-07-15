const express = require('express');
const { protect } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');
const fileController = require('../controllers/file.controller');

const router = express.Router({ mergeParams: true });

router.use(protect);

router.post('/', upload.single('file'), fileController.uploadFile);
router.get('/room/:roomId', fileController.getRoomFiles);
router.patch('/:id', fileController.renameFile);
router.delete('/:id', fileController.deleteFile);

module.exports = router;
