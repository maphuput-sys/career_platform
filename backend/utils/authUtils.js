const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');
const { auth } = require('../config/firebase');

const generateToken = async (uid, role) => {
  const payload = {
    uid,
    role,
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  });
};

const validateToken = async (token) => {
  try {
    // Verify JWT token
    const decoded = jwt.verify(token, jwtConfig.secret);
    
    // Verify Firebase user exists
    await auth.getUser(decoded.uid);
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

const generateRandomPassword = (length = 12) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
};

const sanitizeUser = (user) => {
  const { password, ...sanitized } = user;
  return sanitized;
};

module.exports = {
  generateToken,
  validateToken,
  generateRandomPassword,
  sanitizeUser
};