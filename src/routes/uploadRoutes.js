const express = require('express');
const router = express.Router();
const { uploadFile } = require('../controllers/uploadController');
const { verifyToken } = require('../middleware/auth');

router.post('/upload', verifyToken, uploadFile);

module.exports = router;
