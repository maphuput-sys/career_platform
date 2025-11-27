const express = require('express');
const { authenticate } = require('../middleware/auth');
const { uploadTranscript, handleUploadErrors } = require('../middleware/upload');
const router = express.Router();
const { auth, db, FieldValue } = require('../config/firebase');
// ... rest of your auth controller code
router.use(authenticate);

router.post('/transcript', uploadTranscript, handleUploadErrors, (req, res) => {
  res.json({
    success: true,
    message: 'Transcript uploaded successfully'
  });
});

module.exports = router;