// utils/constants.js
const ERROR_CODES = {
  // Server Errors (5xx)
  SERVER_ERROR: 'SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  
  // Client Errors (4xx)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT: 'RATE_LIMIT',
  CONFLICT: 'CONFLICT',
};

const USER_ROLES = {
  STUDENT: 'student',
  INSTITUTION: 'institution', 
  COMPANY: 'company',
  ADMIN: 'admin'
};

const APPLICATION_STATUS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under-review',
  ACCEPTED: 'accepted', 
  REJECTED: 'rejected',
  WAITLISTED: 'waitlisted'
};

const FILE_TYPES = {
  TRANSCRIPT: 'transcript',
  CERTIFICATE: 'certificate',
  RESUME: 'resume',
  PROFILE_PICTURE: 'profile_picture',
  LOGO: 'logo'
};

const ALLOWED_MIME_TYPES = {
  [FILE_TYPES.TRANSCRIPT]: ['application/pdf', 'image/jpeg', 'image/png'],
  [FILE_TYPES.CERTIFICATE]: ['application/pdf', 'image/jpeg', 'image/png'],
  [FILE_TYPES.RESUME]: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  [FILE_TYPES.PROFILE_PICTURE]: ['image/jpeg', 'image/png', 'image/gif'],
  [FILE_TYPES.LOGO]: ['image/jpeg', 'image/png', 'image/svg+xml']
};

const MAX_FILE_SIZES = {
  [FILE_TYPES.TRANSCRIPT]: 5 * 1024 * 1024, // 5MB
  [FILE_TYPES.CERTIFICATE]: 5 * 1024 * 1024, // 5MB
  [FILE_TYPES.RESUME]: 2 * 1024 * 1024, // 2MB
  [FILE_TYPES.PROFILE_PICTURE]: 1 * 1024 * 1024, // 1MB
  [FILE_TYPES.LOGO]: 1 * 1024 * 1024 // 1MB
};

module.exports = {
  ERROR_CODES,
  USER_ROLES,
  APPLICATION_STATUS,
  FILE_TYPES,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZES
};