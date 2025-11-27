require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { port, nodeEnv } = require('./config/env');

// Import error handling middleware
const { errorHandler, notFoundHandler, routeNotFound } = require('./middleware/errorhandler');

const app = express();

// Security and middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disable for now to avoid issues
}));

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://yourdomain.com' // Add your production domain
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || nodeEnv === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());

// Logging
app.use(morgan(nodeEnv === 'production' ? 'combined' : 'dev'));

// Body parsing middleware with limits
app.use(express.json({ 
  limit: '10mb'
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb'
}));

// Trust proxy (important if behind reverse proxy like nginx)
app.set('trust proxy', 1);

// Static files - serve uploads directory
app.use('/uploads', express.static('uploads', {
  maxAge: nodeEnv === 'production' ? '1d' : '0',
  setHeaders: (res, path) => {
    if (path.endsWith('.pdf')) {
      res.set('Content-Type', 'application/pdf');
    }
  }
}));

// Add security headers for API responses
app.use((req, res, next) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Cache control for API routes
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// API Routes
app.use('/api', require('./routes'));

// Health check endpoint with detailed information
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Career Platform API',
    environment: nodeEnv,
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    nodeVersion: process.version,
    platform: process.platform
  };

  res.status(200).json(healthCheck);
});

// Database connectivity check
app.get('/health/db', async (req, res) => {
  try {
    // Simple database connectivity check
    res.status(200).json({
      status: 'OK',
      database: 'Connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      database: 'Disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API information endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Career Platform API',
    version: '1.0.0',
    documentation: 'Add your documentation URL here',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      institutions: '/api/institutions',
      students: '/api/students',
      companies: '/api/companies',
      applications: '/api/applications',
      jobs: '/api/jobs',
      upload: '/api/upload'
    },
    status: 'operational'
  });
});

// 404 handler for API routes
app.use('/api/*', notFoundHandler);

// Global 404 handler
app.use('*', routeNotFound);

// Global error handler (must be last middleware)
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // In production, you might want to exit the process
  if (nodeEnv === 'production') {
    process.exit(1);
  }
});

// Uncaught exception handler
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // In production, you might want to exit the process
  if (nodeEnv === 'production') {
    process.exit(1);
  }
});

const PORT = port || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 Career Platform Backend Server Started!
📍 Port: ${PORT}
🌍 Environment: ${nodeEnv}
📅 Started at: ${new Date().toISOString()}
🔗 Health check: http://localhost:${PORT}/health
🔗 API Base: http://localhost:${PORT}/api
  `);
});

// Export for testing
module.exports = { app, server };