// routes/studentroutes.js
const express = require('express');
const { asyncHandler } = require('../middleware/errorhandler');
const router = express.Router();

// Get student profile
router.get('/profile', asyncHandler(async (req, res) => {
  const student = {
    id: 'student-123',
    firstName: 'Test',
    lastName: 'Student',
    email: 'student@example.com',
    phone: '+2661234567',
    highSchool: 'Lesotho High School',
    graduationYear: 2024,
    address: 'Maseru, Lesotho',
    createdAt: new Date().toISOString()
  };

  res.json({
    success: true,
    student: student
  });
}));

// Update student profile
router.put('/profile', asyncHandler(async (req, res) => {
  const profileData = req.body;
  
  res.json({
    success: true,
    message: 'Profile updated successfully',
    student: {
      id: 'student-123',
      ...profileData,
      updatedAt: new Date().toISOString()
    }
  });
}));

// Get student applications
router.get('/applications', asyncHandler(async (req, res) => {
  const applications = [
    {
      id: 'app-1',
      courseId: 'course-1',
      courseName: 'Computer Science',
      institutionName: 'National University of Lesotho',
      status: 'pending',
      appliedAt: new Date().toISOString()
    }
  ];

  res.json({
    success: true,
    applications: applications
  });
}));

// Apply for course
router.post('/applications', asyncHandler(async (req, res) => {
  const { courseId, institutionId } = req.body;

  const application = {
    id: 'app-' + Date.now(),
    courseId,
    institutionId,
    status: 'pending',
    appliedAt: new Date().toISOString()
  };

  res.status(201).json({
    success: true,
    message: 'Application submitted successfully',
    application: application
  });
}));

module.exports = router;