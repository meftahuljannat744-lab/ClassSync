const express = require('express');
const router = express.Router();
const {
  createHomework,
  togglePublishHomework,
  getClassroomHomework,
  getHomeworkById,
  addQuestion,
  getQuestionAnswer
} = require('../controllers/homeworkController');
const { verifyToken } = require('../middleware/auth');
const { requireClassroomRole } = require('../middleware/rbac');

router.post('/classrooms/:id/homework', verifyToken, requireClassroomRole(['instructor'], 'classroom'), createHomework);
router.get('/classrooms/:id/homework', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'classroom'), getClassroomHomework);
router.put('/homework/:id/publish', verifyToken, requireClassroomRole(['instructor'], 'homework'), togglePublishHomework);
router.get('/homework/:id', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'homework'), getHomeworkById);
router.post('/homework/:id/questions', verifyToken, requireClassroomRole(['instructor'], 'homework'), addQuestion);
router.get('/questions/:id/answer', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'question'), getQuestionAnswer);

module.exports = router;
