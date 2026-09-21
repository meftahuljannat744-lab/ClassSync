const express = require('express');
const router = express.Router();
const { getAllUsers, getMe, getSubmissionHeatmap } = require('../controllers/userController');
const { getActiveLiveSessions } = require('../controllers/liveSessionController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, getAllUsers);
router.get('/me', verifyToken, getMe);
router.get('/me/submission-heatmap', verifyToken, getSubmissionHeatmap);
router.get('/me/active-live-sessions', verifyToken, getActiveLiveSessions);

module.exports = router;

