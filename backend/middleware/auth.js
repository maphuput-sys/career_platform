const { auth, db } = require('../config/firebase');
const { validateToken } = require('../utils/authUtils');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    const decoded = await validateToken(token);
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    
    if (!userDoc.exists) {
      return res.status(401).json({
        success: false,
        message: 'User not found in database',
        code: 'USER_NOT_FOUND'
      });
    }

    const userData = userDoc.data();
    
    if (userData.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account suspended. Please contact administrator.',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    req.user = {
      uid: decoded.uid,
      ...userData
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: roles,
        current: req.user.role
      });
    }
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = await validateToken(token);
      const userDoc = await db.collection('users').doc(decoded.uid).get();
      
      if (userDoc.exists) {
        req.user = {
          uid: decoded.uid,
          ...userDoc.data()
        };
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth
};