// routes/auth.js
const express = require('express');
const { asyncHandler } = require('../middleware/errorhandler');
const router = express.Router();

// Simple register endpoint
router.post('/register', asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, userType } = req.body;

  console.log('Registration attempt:', { email, userType });

  // Basic validation
  if (!firstName || !lastName || !email || !password || !userType) {
    return res.status(400).json({
      success: false,
      error: 'All fields are required: firstName, lastName, email, password, userType'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 6 characters long'
    });
  }

  if (!['student', 'institution', 'company', 'admin'].includes(userType)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid user type. Must be: student, institution, company, or admin'
    });
  }

  // For now, simulate successful registration
  // In a real app, you'd create the user in Firebase Auth and Firestore
  const user = {
    id: 'user-' + Date.now(),
    firstName,
    lastName,
    email,
    role: userType,
    createdAt: new Date().toISOString(),
    isVerified: false,
    isActive: true
  };

  // Simulate token generation
  const token = 'mock-jwt-token-' + Date.now();

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    user: user,
    token: token
  });
}));

// Simple login endpoint
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
  }

  // For now, simulate successful login
  // In a real app, you'd verify credentials with Firebase Auth
  const user = {
    id: 'user-123',
    email: email,
    firstName: 'Test',
    lastName: 'User',
    role: 'student',
    isVerified: true,
    isActive: true
  };

  const token = 'mock-jwt-token-123';

  res.json({
    success: true,
    message: 'Login successful',
    user: user,
    token: token
  });
}));

// Profile endpoint
router.get('/profile', asyncHandler(async (req, res) => {
  // For now, return a mock profile
  // In a real app, you'd verify the token and get user from database
  const user = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'student',
    isVerified: true,
    isActive: true
  };

  res.json({
    success: true,
    user: user
  });
}));

// Logout endpoint
router.post('/logout', asyncHandler(async (req, res) => {
  // In a real app, you'd invalidate the token
  res.json({
    success: true,
    message: 'Logout successful'
  });
}));

module.exports = router;