const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

// Admin routes will be implemented here
router.get('/dashboard', (req, res) => {
  res.json({
    success: true,
    message: 'Admin dashboard endpoint'
  });
});

module.exports = router;