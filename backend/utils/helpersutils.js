const { FieldValue } = require('../config/firebase');

const paginate = (query, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  return query.limit(limit).offset(offset);
};

const buildSearchQuery = (baseQuery, searchFields, searchTerm) => {
  if (!searchTerm) return baseQuery;

  let query = baseQuery;
  searchFields.forEach((field, index) => {
    if (index === 0) {
      query = query.where(field, '>=', searchTerm)
                   .where(field, '<=', searchTerm + '\uf8ff');
    }
  });

  return query;
};

const formatResponse = (success, message, data = null, error = null) => {
  return {
    success,
    message,
    data,
    error,
    timestamp: new Date().toISOString()
  };
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const generateApplicationId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `APP-${timestamp}-${random}`.toUpperCase();
};

const calculateGPA = (grades) => {
  if (!grades || typeof grades !== 'object') return 0;

  const subjects = Object.values(grades);
  if (subjects.length === 0) return 0;

  const total = subjects.reduce((sum, grade) => {
    const numericGrade = parseFloat(grade) || 0;
    return sum + numericGrade;
  }, 0);

  return total / subjects.length;
};

const sanitizeObject = (obj, allowedFields) => {
  const sanitized = {};
  allowedFields.forEach(field => {
    if (obj[field] !== undefined) {
      sanitized[field] = obj[field];
    }
  });
  return sanitized;
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  paginate,
  buildSearchQuery,
  formatResponse,
  validateEmail,
  generateApplicationId,
  calculateGPA,
  sanitizeObject,
  delay
};