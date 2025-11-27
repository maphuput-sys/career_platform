// routes/index.js
const express = require('express');
const router = express.Router();

// Import routes
router.use('/auth', require('./auth'));
router.use('/admin', require('./adminroutes'));
router.use('/applications', require('./application'));
router.use('/companies', require('./companiesroutes'));
router.use('/institutions', require('./instituteroutes'));
router.use('/jobs', require('./jobs'));
router.use('/students', require('./studentroutes'));
router.use('/upload', require('./upload'));

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

// API info
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Career Platform API',
    version: '1.0.0',
    status: 'operational'
  });
});

module.exports = router;