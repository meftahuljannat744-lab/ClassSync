const express = require('express');
const router = express.Router();
const {
  runPlagiarismScan,
  getPlagiarismFlags,
  reviewPlagiarismFlag
} = require('../controllers/plagiarismController');
const { verifyToken } = require('../middleware/auth');
const { requireClassroomRole } = require('../middleware/rbac');

router.post('/classrooms/:id/plagiarism-check', verifyToken, requireClassroomRole(['instructor'], 'classroom'), runPlagiarismScan);
router.get('/classrooms/:id/plagiarism-flags', verifyToken, requireClassroomRole(['instructor', 'TA'], 'classroom'), getPlagiarismFlags);
router.put('/plagiarism-flags/:id/review', verifyToken, requireClassroomRole(['instructor'], 'plagiarism-flag'), reviewPlagiarismFlag);

module.exports = router;
