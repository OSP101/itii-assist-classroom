const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const { testConnection } = require('./config/database');
const passport = require('./config/passport');
const routes = require('./routes');
const { 
  notFoundHandler, 
  errorConverter, 
  errorHandler 
} = require('./middlewares');
const { logger } = require('./utils');

// Initialize express app
const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  config.frontendUrl,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

// In development, allow any local network IP
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // In development, allow local network IPs (192.168.x.x, 10.x.x.x, etc.)
    if (config.nodeEnv === 'development') {
      const localNetworkPattern = /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|localhost|127\.0\.0\.1)(:\d+)?$/;
      if (localNetworkPattern.test(origin)) {
        return callback(null, true);
      }
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 429,
      message: 'Too many requests, please try again later.',
    },
  },
});
app.use('/api', limiter);

// Auth routes rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 login attempts per windowMs
  message: {
    success: false,
    error: {
      code: 429,
      message: 'Too many login attempts, please try again later.',
    },
  },
});
app.use('/api/auth/login', authLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser(config.cookieSecret));

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  }));
}

// Initialize Passport
app.use(passport.initialize());

// Request Logger Middleware (บันทึกเฉพาะการกระทำต่อระบบ ไม่บันทึกการเข้าหน้า)
const { requestLogger } = require('./middlewares');
app.use('/api', requestLogger({
  logBody: config.nodeEnv === 'development', // Log body only in development
  excludePaths: ['/api/health', '/api/system/metrics', '/api/system/cpu'],
  logAllRequests: false, // บันทึกเฉพาะ POST, PUT, DELETE, PATCH (การกระทำต่อระบบ)
}));

// API routes
app.use('/api', routes);

// Root endpoint with system info
app.get('/', (req, res) => {
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  res.json({
    success: true,
    system: {
      name: 'Course & Lab Management System',
      description: 'ระบบจัดการรายวิชา, เช็คชื่อ, เก็บคะแนน และจองคิวตรวจงาน',
      version: '1.0.0',
    },
    developer: {
      name: 'OSP101',
      project: 'Senior Project (โปรเจคจบ)',
      university: 'Khon Kaen University',
    },
    technology: {
      runtime: `Node.js ${process.version}`,
      framework: 'Express.js',
      database: 'MySQL with Sequelize ORM',
      authentication: 'Passport.js + JWT',
      realtime: 'Socket.io (coming soon)',
    },
    server: {
      environment: config.nodeEnv,
      port: config.port,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
      uptime: `${days}d ${hours}h ${minutes}m ${seconds}s`,
      startedAt: new Date(Date.now() - uptime * 1000).toISOString(),
    },
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      docs: 'Coming soon...',
    },
    timestamp: new Date().toISOString(),
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorConverter);
app.use(errorHandler);

// Import http and socket.io
const http = require('http');
const { initializeSocket } = require('./config/socket');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = initializeSocket(server);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Start listening (use server instead of app for socket.io)
    server.listen(config.port, () => {
      logger.info(`🚀 Server running in ${config.nodeEnv} mode on port ${config.port}`);
      logger.info(`📍 API URL: http://localhost:${config.port}/api`);
      logger.info(`🔌 Socket.io enabled`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer();

module.exports = { app, server, io };
