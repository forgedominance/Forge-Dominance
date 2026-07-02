const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const uploadController = require('../controllers/uploadController');

const router = express.Router();

router.post('/upload-image', authenticate, authorize('admin'), uploadController.uploadImage);
router.post('/upload-base64', authenticate, authorize('admin'), uploadController.uploadBase64);
router.post('/upload-ad-image', authenticate, authorize('admin'), uploadController.uploadAdImage);
router.post('/upload-review-image', authenticate, authorize('admin'), uploadController.uploadReviewImage);
router.post('/upload-admin-avatar', authenticate, authorize('admin'), uploadController.uploadAdminAvatar);

module.exports = router;


