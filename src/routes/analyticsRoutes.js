const express = require('express');
const router = express.Router();
const { getLeaderboard, getClassHealth } = require('../controllers/analyticsController');
const { verifyToken } = require('../middleware/auth');
const { requireClassroomRole } = require('../middleware/rbac');

router.get('/classrooms/:id/leaderboard', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'classroom'), getLeaderboard);
router.get('/classrooms/:id/health', verifyToken, requireClassroomRole(['instructor', 'TA'], 'classroom'), getClassHealth);

module.exports = router;
