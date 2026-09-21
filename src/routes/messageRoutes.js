const express = require('express');
const router = express.Router();
const {
  getClassroomMessages,
  postClassroomMessage,
  getDmContacts,
  getDirectMessages,
  postDirectMessage,
  getUnreadDmCount
} = require('../controllers/messageController');
const { verifyToken } = require('../middleware/auth');
const { requireClassroomRole } = require('../middleware/rbac');

// All messaging endpoints require authentication and active membership in the specified classroom
router.get('/classrooms/:id/messages', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'classroom'), getClassroomMessages);
router.post('/classrooms/:id/messages', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'classroom'), postClassroomMessage);

router.get('/classrooms/:id/dm-contacts', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'classroom'), getDmContacts);
router.get('/classrooms/:id/dm/unread-count', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'classroom'), getUnreadDmCount);
router.get('/classrooms/:id/dm/:otherUserId', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'classroom'), getDirectMessages);
router.post('/classrooms/:id/dm/:otherUserId', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'classroom'), postDirectMessage);

module.exports = router;
