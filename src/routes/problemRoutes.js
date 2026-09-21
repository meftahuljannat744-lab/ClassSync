const express = require('express');
const router = express.Router();
const {
  getClassroomProblems,
  createProblem,
  getProblemById,
  upsertProblemAnswer
} = require('../controllers/problemController');
const { verifyToken } = require('../middleware/auth');
const { requireClassroomRole } = require('../middleware/rbac');

router.get('/classrooms/:id/problems', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'classroom'), getClassroomProblems);
router.post('/classrooms/:id/problems', verifyToken, requireClassroomRole(['instructor', 'TA'], 'classroom'), createProblem);
router.get('/problems/:id', verifyToken, requireClassroomRole(['instructor', 'TA', 'learner'], 'problem'), getProblemById);
router.post('/problems/:id/answer', verifyToken, requireClassroomRole(['instructor'], 'problem'), upsertProblemAnswer);

module.exports = router;
