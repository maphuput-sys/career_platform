const { body, param, query } = require('express-validator');
const { db } = require('../config/firebase');
const { MAX_FILE_SIZES, ALLOWED_MIME_TYPES, FILE_TYPES } = require('./constants');

// User validation rules
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
    .custom(async (email) => {
      const userSnapshot = await db.collection('users')
        .where('email', '==', email.toLowerCase())
        .get();
      if (!userSnapshot.empty) {
        throw new Error('Email already registered');
      }
      return true;
    }),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('role')
    .isIn(['student', 'institution', 'company'])
    .withMessage('Invalid role specified'),
  body('profile.name')
    .notEmpty()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('profile.phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const validateProfileUpdate = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio must not exceed 500 characters'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
  body('education')
    .optional()
    .isArray()
    .withMessage('Education must be an array'),
  body('experience')
    .optional()
    .isArray()
    .withMessage('Experience must be an array'),
];

// Course validation rules
const validateCourseCreation = [
  body('name')
    .notEmpty()
    .isLength({ max: 100 })
    .withMessage('Course name is required and must not exceed 100 characters'),
  body('facultyId')
    .notEmpty()
    .withMessage('Faculty ID is required'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('duration')
    .notEmpty()
    .isLength({ max: 50 })
    .withMessage('Duration is required'),
  body('capacity')
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer'),
  body('requirements')
    .optional()
    .isObject()
    .withMessage('Requirements must be an object'),
  body('fees')
    .optional()
    .isObject()
    .withMessage('Fees must be an object'),
];

// Job validation rules
const validateJobCreation = [
  body('title')
    .notEmpty()
    .isLength({ max: 100 })
    .withMessage('Job title is required and must not exceed 100 characters'),
  body('description')
    .notEmpty()
    .isLength({ max: 2000 })
    .withMessage('Description is required and must not exceed 2000 characters'),
  body('location')
    .notEmpty()
    .isLength({ max: 100 })
    .withMessage('Location is required'),
  body('jobType')
    .isIn(['full_time', 'part_time', 'contract', 'internship', 'remote'])
    .withMessage('Invalid job type'),
  body('deadline')
    .isISO8601()
    .withMessage('Invalid deadline format')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Deadline must be in the future');
      }
      return true;
    }),
  body('salaryRange')
    .optional()
    .isObject()
    .withMessage('Salary range must be an object'),
  body('qualifications')
    .optional()
    .isArray()
    .withMessage('Qualifications must be an array'),
  body('requirements')
    .optional()
    .isObject()
    .withMessage('Requirements must be an object'),
];

// Application validation rules
const validateApplication = [
  body('courseId')
    .notEmpty()
    .withMessage('Course ID is required')
    .custom(async (courseId) => {
      const courseDoc = await db.collection('courses').doc(courseId).get();
      if (!courseDoc.exists) {
        throw new Error('Course not found');
      }
      return true;
    }),
  body('institutionId')
    .notEmpty()
    .withMessage('Institution ID is required')
    .custom(async (institutionId) => {
      const institutionDoc = await db.collection('users').doc(institutionId).get();
      if (!institutionDoc.exists || institutionDoc.data().role !== 'institution') {
        throw new Error('Institution not found');
      }
      return true;
    }),
];

// File validation
const validateFile = (file, fileType) => {
  if (!file) {
    throw new Error('No file provided');
  }

  const allowedTypes = ALLOWED_MIME_TYPES[fileType];
  const maxSize = MAX_FILE_SIZES[fileType];

  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error(`Invalid file type for ${fileType}. Allowed types: ${allowedTypes.join(', ')}`);
  }

  if (file.size > maxSize) {
    throw new Error(`File size too large for ${fileType}. Maximum size: ${maxSize / 1024 / 1024}MB`);
  }

  return true;
};

// Query validation rules
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

const validateSearch = [
  query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search query must not exceed 100 characters'),
];

// ID validation
const validateObjectId = [
  param('id')
    .notEmpty()
    .withMessage('ID is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Invalid ID format'),
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validateCourseCreation,
  validateJobCreation,
  validateApplication,
  validateFile,
  validatePagination,
  validateSearch,
  validateObjectId,
};