const express = require('express');
const router = express.Router();
const {
  createHomework,
  updateHomework,
  deleteHomework,
  togglePublishHomework,
  getClassroomHomework,
  getHomeworkById,
  addQuestion,
  updateQuestion,
  getQuestionAnswer
} = require('../controllers/homeworkController');
const { verifyToken } = require('../middleware/auth');
const { requireClassroomRole } = require('../middleware/rbac');

router.post('/classrooms/:id/homework', verifyToken, requireClassroomRole(['instructor'], 'classroom'), createHomework);
router.put('/homework/:id', verifyToken, requireClassroomRole(['instructor'], 'homework'), updateHomework);
router.delete('/homework/:id', verifyToken, requireClassroomRole(['instructor'], 'homework'), deleteHomework);
router.get('/classrooms/:id/homework', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'classroom'), getClassroomHomework);
router.put('/homework/:id/publish', verifyToken, requireClassroomRole(['instructor'], 'homework'), togglePublishHomework);
router.get('/homework/:id', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'homework'), getHomeworkById);
router.post('/homework/:id/questions', verifyToken, requireClassroomRole(['instructor'], 'homework'), addQuestion);
router.put('/questions/:id', verifyToken, requireClassroomRole(['instructor'], 'question'), updateQuestion);
router.get('/questions/:id/answer', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'question'), getQuestionAnswer);

module.exports = router;
