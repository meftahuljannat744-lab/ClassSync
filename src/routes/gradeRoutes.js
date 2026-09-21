const express = require('express');
const router = express.Router();
const {
  gradeSubmission,
  addCodeReview,
  getCodeReviews,
  getConsolidatedGradings
} = require('../controllers/gradeController');
const { verifyToken } = require('../middleware/auth');
const { requireClassroomRole } = require('../middleware/rbac');

router.get('/classrooms/:id/gradings', verifyToken, requireClassroomRole(['instructor', 'TA'], 'classroom'), getConsolidatedGradings);
router.post('/submissions/:id/grade', verifyToken, requireClassroomRole(['instructor', 'TA'], 'submission'), gradeSubmission);
router.post('/submissions/:id/code-reviews', verifyToken, requireClassroomRole(['instructor', 'TA'], 'submission'), addCodeReview);
router.get('/submissions/:id/code-reviews', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'submission'), getCodeReviews);

module.exports = router;

