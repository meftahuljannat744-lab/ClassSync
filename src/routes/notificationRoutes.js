const express = require('express');
const router = express.Router();
const { getNotifications, markNotificationRead, markAllRead } = require('../controllers/notificationController');
const { getSubmissionHeatmap } = require('../controllers/userController');
const { getMyAlerts } = require('../controllers/alertController');
const { verifyToken } = require('../middleware/auth');

router.get('/me/notifications', verifyToken, getNotifications);
router.get('/users/me/notifications', verifyToken, getNotifications);
router.get('/me/submission-heatmap', verifyToken, getSubmissionHeatmap);
router.get('/users/me/submission-heatmap', verifyToken, getSubmissionHeatmap);
router.get('/me/alerts', verifyToken, getMyAlerts);
router.put('/notifications/:id/read', verifyToken, markNotificationRead);
router.post('/notifications/mark-all-read', verifyToken, markAllRead);

module.exports = router;
