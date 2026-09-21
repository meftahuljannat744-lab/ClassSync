const express = require('express');
const router = express.Router();
const {
  submitQuestionSolution,
  getSubmissionMatrix,
  getQuestionSubmissions
} = require('../controllers/submissionController');
const { verifyToken } = require('../middleware/auth');
const { requireClassroomRole } = require('../middleware/rbac');

router.post('/questions/:id/submit', verifyToken, requireClassroomRole(['learner', 'instructor', 'TA'], 'question'), submitQuestionSolution);
router.get('/homework/:id/matrix', verifyToken, requireClassroomRole(['instructor', 'TA'], 'homework'), getSubmissionMatrix);
router.get('/questions/:id/submissions', verifyToken, requireClassroomRole(['instructor', 'TA'], 'question'), getQuestionSubmissions);

module.exports = router;
