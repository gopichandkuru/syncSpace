const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const authValidator = require('../validators/auth.validator');
const { authLimiter } = require('../middlewares/rateLimiter');

router.post('/register', authLimiter, validate(authValidator.register), authController.register);
router.post('/login', authLimiter, validate(authValidator.login), authController.login);
router.post('/logout', protect, authController.logout);
router.post('/refresh', authController.refreshToken);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/forgot-password', authLimiter, validate(authValidator.forgotPassword), authController.forgotPassword);
router.post('/reset-password/:token', authLimiter, validate(authValidator.resetPassword), authController.resetPassword);
router.get('/me', protect, authController.getMe);

module.exports = router;
