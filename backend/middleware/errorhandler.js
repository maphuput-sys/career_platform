const ERROR_CODES = {
  SERVER_ERROR: 'SERVER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT: 'RATE_LIMIT'
};

/**
 * Custom Error Classes
 */
class AppError extends Error {
  constructor(message, statusCode, errorCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, ERROR_CODES.VALIDATION_ERROR, details);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, ERROR_CODES.AUTH_ERROR);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, ERROR_CODES.PERMISSION_DENIED);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, ERROR_CODES.NOT_FOUND);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, ERROR_CODES.VALIDATION_ERROR);
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, ERROR_CODES.RATE_LIMIT);
  }
}

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log error for debugging
  logError(error, req);

  // Firebase Admin SDK errors
  if (err.code && err.code.startsWith('auth/')) {
    error = handleFirebaseAuthError(err);
  }

  // Firestore errors
  if (err.code && err.code.startsWith('firestore/')) {
    error = handleFirestoreError(err);
  }

  // Multer file upload errors
  if (err.code && err.code.startsWith('LIMIT_')) {
    error = handleMulterError(err);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AuthenticationError('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AuthenticationError('Token expired');
  }

  // Mongoose validation errors (if using MongoDB)
  if (err.name === 'ValidationError') {
    error = handleValidationError(err);
  }

  // Mongoose duplicate key errors
  if (err.code === 11000) {
    error = new ConflictError('Duplicate field value entered');
  }

  // Cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    error = new ValidationError('Invalid resource ID');
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const errorCode = error.errorCode || ERROR_CODES.SERVER_ERROR;

  // Error response
  const errorResponse = {
    success: false,
    message: error.message || 'Internal Server Error',
    errorCode,
    ...(error.details && { details: error.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Handle Firebase Authentication Errors
 */
const handleFirebaseAuthError = (err) => {
  switch (err.code) {
    case 'auth/email-already-exists':
      return new ConflictError('Email already exists');
    
    case 'auth/invalid-email':
      return new ValidationError('Invalid email address');
    
    case 'auth/weak-password':
      return new ValidationError('Password is too weak');
    
    case 'auth/user-not-found':
      return new AuthenticationError('Invalid email or password');
    
    case 'auth/wrong-password':
      return new AuthenticationError('Invalid email or password');
    
    case 'auth/invalid-credential':
      return new AuthenticationError('Invalid credentials');
    
    case 'auth/too-many-requests':
      return new RateLimitError('Too many login attempts. Please try again later.');
    
    case 'auth/user-disabled':
      return new AuthenticationError('Account has been disabled');
    
    default:
      return new AppError('Authentication error', 401, ERROR_CODES.AUTH_ERROR);
  }
};

/**
 * Handle Firestore Errors
 */
const handleFirestoreError = (err) => {
  switch (err.code) {
    case 'firestore/not-found':
      return new NotFoundError('Resource not found');
    
    case 'firestore/permission-denied':
      return new AuthorizationError('Access denied');
    
    case 'firestore/unauthenticated':
      return new AuthenticationError('Authentication required');
    
    case 'firestore/invalid-argument':
      return new ValidationError('Invalid request data');
    
    case 'firestore/deadline-exceeded':
      return new AppError('Request timeout', 408, ERROR_CODES.SERVER_ERROR);
    
    default:
      return new AppError('Database error', 500, ERROR_CODES.SERVER_ERROR);
  }
};

/**
 * Handle Multer File Upload Errors
 */
const handleMulterError = (err) => {
  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      return new ValidationError('File size too large');
    
    case 'LIMIT_FILE_COUNT':
      return new ValidationError('Too many files');
    
    case 'LIMIT_UNEXPECTED_FILE':
      return new ValidationError('Unexpected file field');
    
    case 'LIMIT_PART_COUNT':
      return new ValidationError('Too many form parts');
    
    default:
      return new ValidationError('File upload error');
  }
};

/**
 * Handle Mongoose Validation Errors
 */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(e => ({
    field: e.path,
    message: e.message,
    value: e.value
  }));

  return new ValidationError('Validation failed', errors);
};

/**
 * Error Logger
 */
const logError = (error, req) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode
    },
    user: req.user ? {
      id: req.user.uid,
      role: req.user.role
    } : null
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('🚨 Error:', logEntry);
  }

  // In production, you might want to log to a file or service
  if (process.env.NODE_ENV === 'production') {
    // Log to file or external service
    console.error('Production Error:', {
      timestamp: logEntry.timestamp,
      method: logEntry.method,
      url: logEntry.url,
      error: logEntry.error.message,
      user: logEntry.user
    });
  }
};

/**
 * Async Error Handler Wrapper
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 404 Not Found Handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Endpoint ${req.method} ${req.originalUrl}`);
  next(error);
};

/**
 * Route Not Found Middleware
 */
const routeNotFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errorCode: ERROR_CODES.NOT_FOUND
  });
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  routeNotFound,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError
};