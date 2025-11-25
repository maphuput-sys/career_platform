const express = require('express');
const { authenticate } = require('../middleware/auth');
const router = express.Router();
const { auth, db, FieldValue } = require('../config/firebase');
// ... rest of your auth controller code
router.use(authenticate);

router.get('/student', (req, res) => {
  res.json({
    success: true,
    message: 'Student applications endpoint'
  });
});

module.exports = router;