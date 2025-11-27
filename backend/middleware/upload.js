const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { app } = require('../config/env');
const { MAX_FILE_SIZES, ALLOWED_MIME_TYPES, FILE_TYPES } = require('../utils/constants');

// Promisify file system operations for better async handling
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);
const unlinkAsync = promisify(fs.unlink);

// Ensure upload directories exist
const createUploadDirectories = () => {
  const directories = [
    'uploads/transcripts',
    'uploads/certificates', 
    'uploads/profiles',
    'uploads/temp'
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  });
};

createUploadDirectories();

// Configure storage for different file types
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    switch (file.fieldname) {
      case 'transcript':
        uploadPath += 'transcripts/';
        break;
      case 'certificate':
        uploadPath += 'certificates/';
        break;
      case 'profile':
        uploadPath += 'profiles/';
        break;
      default:
        uploadPath += 'temp/';
    }
    
    // Ensure the specific directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const userID = req.user?.uid || 'anonymous';
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, fileExtension)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);
    
    const filename = `${userID}_${baseName}_${timestamp}_${randomString}${fileExtension}`;
    
    cb(null, filename);
  }
});

// File filter configuration
const createFileFilter = (fieldName, allowedMimeTypes, maxSize) => {
  return (req, file, cb) => {
    // Check file size
    if (file.size > maxSize) {
      return cb(new Error(`File size too large. Maximum size: ${maxSize / 1024 / 1024}MB`), false);
    }

    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error(`Invalid file type for ${fieldName}. Allowed types: ${allowedMimeTypes.join(', ')}`), false);
    }

    // Check file extension
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    };

    const validExtensions = allowedMimeTypes.flatMap(mimeType => allowedExtensions[mimeType] || []);
    if (validExtensions.length > 0 && !validExtensions.includes(fileExtension)) {
      return cb(new Error(`Invalid file extension for ${fieldName}. Allowed extensions: ${validExtensions.join(', ')}`), false);
    }

    cb(null, true);
  };
};

// Create multer instances for different file types
const uploadTranscript = multer({
  storage,
  fileFilter: createFileFilter(
    'transcript',
    ALLOWED_MIME_TYPES[FILE_TYPES.TRANSCRIPT],
    MAX_FILE_SIZES[FILE_TYPES.TRANSCRIPT]
  ),
  limits: {
    fileSize: MAX_FILE_SIZES[FILE_TYPES.TRANSCRIPT]
  }
}).single('transcript');

const uploadCertificate = multer({
  storage,
  fileFilter: createFileFilter(
    'certificate', 
    ALLOWED_MIME_TYPES[FILE_TYPES.CERTIFICATE],
    MAX_FILE_SIZES[FILE_TYPES.CERTIFICATE]
  ),
  limits: {
    fileSize: MAX_FILE_SIZES[FILE_TYPES.CERTIFICATE]
  }
}).single('certificate');

const uploadProfile = multer({
  storage,
  fileFilter: createFileFilter(
    'profile',
    ALLOWED_MIME_TYPES[FILE_TYPES.PROFILE_IMAGE], 
    MAX_FILE_SIZES[FILE_TYPES.PROFILE_IMAGE]
  ),
  limits: {
    fileSize: MAX_FILE_SIZES[FILE_TYPES.PROFILE_IMAGE]
  }
}).single('profile');

const uploadMultiple = multer({
  storage: multer.diskStorage({
    destination: 'uploads/temp/',
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = path.extname(file.originalname);
      const filename = `doc_${timestamp}_${randomString}${fileExtension}`;
      cb(null, filename);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf', 
      'image/jpeg', 
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Allowed: PDF, JPEG, PNG, DOC, DOCX'), false);
    }
    
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5
  }
}).array('documents', 5);

// Error handling middleware for uploads
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    let message = 'Upload error';
    
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many form parts';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Field name too long';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value too long';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields';
        break;
    }
    
    return res.status(400).json({
      success: false,
      message,
      error: err.message,
      errorCode: 'UPLOAD_ERROR'
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: 'Upload error',
      error: err.message,
      errorCode: 'UPLOAD_ERROR'
    });
  }
  next();
};

// Improved cleanup temporary files middleware with async/await
const cleanupTempFiles = async (req, res, next) => {
  try {
    const tempDir = 'uploads/temp/';
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    if (!fs.existsSync(tempDir)) {
      return next();
    }

    const files = await readdirAsync(tempDir);
    
    const cleanupPromises = files.map(async (file) => {
      try {
        const filePath = path.join(tempDir, file);
        const stats = await statAsync(filePath);
        
        if (stats.mtimeMs < oneHourAgo) {
          await unlinkAsync(filePath);
          console.log(`🧹 Cleaned up temp file: ${file}`);
        }
      } catch (error) {
        console.error(`Error cleaning up file ${file}:`, error);
        // Don't throw error for individual file cleanup failures
      }
    });

    // Run cleanup in background, don't wait for completion
    Promise.all(cleanupPromises)
      .then(() => {
        if (cleanupPromises.length > 0) {
          console.log(`✅ Temp files cleanup completed. Processed ${cleanupPromises.length} files.`);
        }
      })
      .catch(error => {
        console.error('Error in temp files cleanup:', error);
      });

    next();
  } catch (error) {
    console.error('Error in cleanupTempFiles middleware:', error);
    // Don't block request if cleanup fails
    next();
  }
};

// Middleware to clean up files on failed requests
const cleanupOnError = (req, res, next) => {
  // Store reference to the original send function
  const originalSend = res.send;
  
  res.send = function(data) {
    // If response status is error (4xx or 5xx), clean up uploaded files
    if (res.statusCode >= 400 && req.files) {
      cleanupUploadedFiles(req.files).catch(error => {
        console.error('Error cleaning up files on error response:', error);
      });
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// Helper function to clean up uploaded files
const cleanupUploadedFiles = async (files) => {
  if (!files || (Array.isArray(files) && files.length === 0)) {
    return;
  }

  const filesArray = Array.isArray(files) ? files : [files];
  
  const cleanupPromises = filesArray.map(async (file) => {
    try {
      if (file.path && fs.existsSync(file.path)) {
        await unlinkAsync(file.path);
        console.log(`🧹 Cleaned up file on error: ${file.path}`);
      }
    } catch (error) {
      console.error(`Error cleaning up file ${file.path}:`, error);
    }
  });

  await Promise.allSettled(cleanupPromises);
};

// Middleware to get file information
const getFileInfo = (req, res, next) => {
  if (req.file) {
    req.fileInfo = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path,
      destination: req.file.destination
    };
  }
  
  if (req.files) {
    req.filesInfo = Array.isArray(req.files) 
      ? req.files.map(file => ({
          originalName: file.originalname,
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype,
          path: file.path,
          destination: file.destination
        }))
      : [];
  }
  
  next();
};

module.exports = {
  uploadTranscript,
  uploadCertificate,
  uploadProfile,
  uploadMultiple,
  handleUploadErrors,
  cleanupTempFiles,
  cleanupOnError,
  getFileInfo
};