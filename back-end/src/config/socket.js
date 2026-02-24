/**
 * Socket.io Configuration
 * Real-time communication for attendance system and data sync
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('./index');
const logger = require('../utils/logger');

let io = null;

/**
 * Initialize Socket.io with HTTP server
 */
const initializeSocket = (httpServer) => {
io = new Server(httpServer, {
  path: "/socket.io",
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        config.frontendUrl,
        "http://localhost:3000",
        "http://localhost:3010",
        "http://127.0.0.1:3000",
        "http://10.199.10.10:3000",
        "https://itii.osp101.dev",
        "https://itii-mid.osp101.com",
      ];
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Allow local network IPs (192.168.x.x, 10.x.x.x, etc.)
      const localNetworkPattern = /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|localhost|127\.0\.0\.1)(:\d+)?$/;
      if (localNetworkPattern.test(origin)) {
        return callback(null, true);
      }
      
      logger.warn(`Socket.IO CORS rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ["polling", "websocket"],
});

  // ========== Authentication Middleware ==========
  // Optionally verify JWT on handshake — attaches user info to socket
  // Public clients (projector, queue student view) connect without a token
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      // Allow unauthenticated connections (projector, public queue)
      socket.user = null;
      return next();
    }
    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret);
      socket.user = decoded; // { userId, role, ... }
      return next();
    } catch (err) {
      // Invalid token — reject connection
      return next(new Error('Authentication error: invalid token'));
    }
  });

  // Helper: require authentication for a socket event
  const requireAuth = (socket, eventName) => {
    if (!socket.user) {
      socket.emit('error', { message: `Authentication required for ${eventName}` });
      return false;
    }
    return true;
  };

  // Connection handler
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.user?.userId || 'anonymous'})`);

    // ========== Attendance Rooms ==========
    // Join attendance room (public — students check in here)
    socket.on('join-attendance', (sessionId) => {
      if (!sessionId) return;
      const room = `attendance-${sessionId}`;
      socket.join(room);
      logger.debug(`Socket ${socket.id} joined room: ${room}`);
    });

    // Leave attendance room
    socket.on('leave-attendance', (sessionId) => {
      if (!sessionId) return;
      const room = `attendance-${sessionId}`;
      socket.leave(room);
      logger.debug(`Socket ${socket.id} left room: ${room}`);
    });

    // Instructor room — REQUIRES AUTH (instructor/admin/ta only)
    socket.on('join-instructor', (sessionId) => {
      if (!requireAuth(socket, 'join-instructor')) return;
      if (!sessionId) return;
      const room = `instructor-${sessionId}`;
      socket.join(room);
      logger.debug(`Instructor ${socket.id} joined room: ${room}`);
    });

    // Leave instructor room
    socket.on('leave-instructor', (sessionId) => {
      if (!sessionId) return;
      const room = `instructor-${sessionId}`;
      socket.leave(room);
      logger.debug(`Instructor ${socket.id} left room: ${room}`);
    });

    // ========== Course Sync Rooms ==========
    // Join user's course updates room — REQUIRES AUTH
    socket.on('join-user-courses', (userId) => {
      if (!requireAuth(socket, 'join-user-courses')) return;
      // Only allow joining own room
      if (String(userId) !== String(socket.user.userId)) return;
      const room = `user-courses-${userId}`;
      socket.join(room);
      socket.join('global-courses');
      logger.debug(`Socket ${socket.id} joined course updates room: ${room}`);
    });

    // Leave user's course updates room
    socket.on('leave-user-courses', (userId) => {
      if (!userId) return;
      const room = `user-courses-${userId}`;
      socket.leave(room);
      socket.leave('global-courses');
      logger.debug(`Socket ${socket.id} left course updates room: ${room}`);
    });

    // Handle course change event — REQUIRES AUTH
    socket.on('course-change', (data) => {
      if (!requireAuth(socket, 'course-change')) return;
      logger.debug(`Course change event from ${socket.user.userId}:`, data);
      socket.to('global-courses').emit('course-updated', {
        ...data,
        timestamp: Date.now(),
      });
    });

    // ========== Classroom Sync Rooms ==========
    // Join classroom room — REQUIRES AUTH
    socket.on('join-classroom', (classroomId) => {
      if (!requireAuth(socket, 'join-classroom')) return;
      if (!classroomId) return;
      const room = `classroom-${classroomId}`;
      socket.join(room);
      logger.debug(`Socket ${socket.id} joined classroom room: ${room}`);
    });

    // Leave classroom room
    socket.on('leave-classroom', (classroomId) => {
      if (!classroomId) return;
      const room = `classroom-${classroomId}`;
      socket.leave(room);
      logger.debug(`Socket ${socket.id} left classroom room: ${room}`);
    });

    // Handle classroom data change — REQUIRES AUTH
    socket.on('classroom-change', (data) => {
      if (!requireAuth(socket, 'classroom-change')) return;
      const { classroomId, type, payload } = data;
      logger.debug(`Classroom ${classroomId} change from ${socket.user.userId}:`, type);
      socket.to(`classroom-${classroomId}`).emit('classroom-updated', {
        type,
        payload,
        timestamp: Date.now(),
      });
    });

    // ========== Global Updates Room ==========
    // Join global updates room — REQUIRES AUTH
    socket.on('join-global-updates', () => {
      if (!requireAuth(socket, 'join-global-updates')) return;
      socket.join('global-updates');
      logger.debug(`Socket ${socket.id} joined global updates room`);
    });

    // Leave global updates room
    socket.on('leave-global-updates', () => {
      socket.leave('global-updates');
      logger.debug(`Socket ${socket.id} left global updates room`);
    });

    // ========== Queue System Rooms ==========
    // Join queue session room (public — projector + students)
    socket.on('join-queue', (sessionId) => {
      if (!sessionId) return;
      const room = `queue-${sessionId}`;
      socket.join(room);
      logger.debug(`Socket ${socket.id} joined queue room: ${room}`);
    });

    // Leave queue session room
    socket.on('leave-queue', (sessionId) => {
      if (!sessionId) return;
      const room = `queue-${sessionId}`;
      socket.leave(room);
      logger.debug(`Socket ${socket.id} left queue room: ${room}`);
    });

    // Join worker room — REQUIRES AUTH (only own room)
    socket.on('join-worker', (userId) => {
      if (!requireAuth(socket, 'join-worker')) return;
      // Only allow joining own worker room
      if (String(userId) !== String(socket.user.userId)) return;
      const room = `worker-${String(userId)}`;
      socket.join(room);
      logger.debug(`Worker ${socket.id} joined room: ${room}`);
      socket.userId = String(userId);
    });

    // Leave worker room
    socket.on('leave-worker', (userId) => {
      if (!userId) return;
      const room = `worker-${String(userId)}`;
      socket.leave(room);
      logger.debug(`Worker ${socket.id} left room: ${room}`);
    });

    // Join booking room (public — students track their own booking)
    socket.on('join-booking', (bookingId) => {
      if (!bookingId) return;
      const room = `booking-${bookingId}`;
      socket.join(room);
      logger.debug(`Socket ${socket.id} joined booking room: ${room}`);
    });

    // Leave booking room
    socket.on('leave-booking', (bookingId) => {
      if (!bookingId) return;
      const room = `booking-${bookingId}`;
      socket.leave(room);
      logger.debug(`Socket ${socket.id} left booking room: ${room}`);
    });

    // ========== Generic Data Change Event ==========
    // Handle any data change — REQUIRES AUTH
    socket.on('data-change', (data) => {
      if (!requireAuth(socket, 'data-change')) return;
      const { resource, action, id, data: payload } = data;
      logger.debug(`Data change from ${socket.user.userId} - Resource: ${resource}, Action: ${action}, ID: ${id || 'N/A'}`);
      
      socket.to('global-updates').emit('data-updated', {
        resource,
        action,
        id,
        data: payload,
        timestamp: Date.now(),
      });

      if (resource === 'course') {
        socket.to('global-courses').emit('course-updated', {
          action,
          courseId: id,
          timestamp: Date.now(),
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id}, reason: ${reason}`);
    });
  });

  return io;
};

/**
 * Get Socket.io instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocket first.');
  }
  return io;
};

/**
 * Emit to attendance room
 */
const emitToAttendance = (sessionId, event, data) => {
  if (io) {
    io.to(`attendance-${sessionId}`).emit(event, data);
    io.to(`instructor-${sessionId}`).emit(event, data);
  }
};

/**
 * Emit to instructor room only
 */
const emitToInstructor = (sessionId, event, data) => {
  if (io) {
    io.to(`instructor-${sessionId}`).emit(event, data);
  }
};

/**
 * Emit course update to all connected users
 */
const emitCourseUpdate = (action, courseId, userId) => {
  if (io) {
    io.to('global-courses').emit('course-updated', {
      action,
      courseId,
      userId,
      timestamp: Date.now(),
    });
  }
};

/**
 * Emit classroom update
 */
const emitToClassroom = (classroomId, type, payload) => {
  if (io) {
    io.to(`classroom-${classroomId}`).emit('classroom-updated', {
      type,
      payload,
      timestamp: Date.now(),
    });
  }
};

/**
 * Emit generic data update to all connected clients
 * @param {string} resource - Resource type (course, student, user, classroom, etc.)
 * @param {string} action - Action type (create, update, delete, toggle, bulk)
 * @param {string|number} id - Optional resource ID
 * @param {any} data - Optional additional data
 */
const emitDataUpdate = (resource, action, id = null, data = null) => {
  if (io) {
    io.to('global-updates').emit('data-updated', {
      resource,
      action,
      id,
      data,
      timestamp: Date.now(),
    });
    logger.debug(`Data update emitted - Resource: ${resource}, Action: ${action}, ID: ${id || 'N/A'}`);
  }
};

module.exports = {
  initializeSocket,
  getIO,
  // Attendance
  emitToAttendance,
  emitToInstructor,
  emitCourseUpdate,
  emitToClassroom,
  emitDataUpdate,
};
