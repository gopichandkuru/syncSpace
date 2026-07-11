const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');

router.use(protect);
router.get('/profile', userController.getProfile);
router.patch('/profile', upload.single('avatar'), userController.updateProfile);
router.patch('/change-password', userController.changePassword);
router.get('/activity', userController.getActivityLog);
router.get('/search', userController.searchUsers);

module.exports = router;
