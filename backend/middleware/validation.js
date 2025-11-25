const { validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

const validateObjectId = (value) => {
  // Firebase document ID validation
  if (typeof value !== 'string' || value.length < 1 || value.length > 50) {
    throw new Error('Invalid document ID format');
  }
  return true;
};

module.exports = {
  handleValidationErrors,
  validateObjectId
};