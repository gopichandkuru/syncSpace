const express = require('express');
const { protect } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');
const documentController = require('../controllers/document.controller');

const router = express.Router({ mergeParams: true }); // to allow /rooms/:roomId/documents

router.use(protect);

router.post('/', upload.single('file'), documentController.createDocument);
router.get('/room/:roomId', documentController.getRoomDocuments);
router.get('/:id', documentController.getDocument);
router.post('/:id/versions', documentController.saveVersion);
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
