/**
 * Socket.io Configuration
 * Real-time communication for attendance and queue system
 */

const { Server } = require('socket.io');
const config = require('./index');

let io = null;

/**
 * Initialize Socket.io with HTTP server
 */
const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        config.frontendUrl,
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Enable reconnection
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ============================================
    // Attendance System Rooms
    // ============================================

    // Join attendance room
    socket.on('join-attendance', (sessionId) => {
      const room = `attendance-${sessionId}`;
      socket.join(room);
      console.log(`👤 Socket ${socket.id} joined room: ${room}`);
    });

    // Leave attendance room
    socket.on('leave-attendance', (sessionId) => {
      const room = `attendance-${sessionId}`;
      socket.leave(room);
      console.log(`👤 Socket ${socket.id} left room: ${room}`);
    });

    // Instructor room (for receiving updates)
    socket.on('join-instructor', (sessionId) => {
      const room = `instructor-${sessionId}`;
      socket.join(room);
      console.log(`🎓 Instructor ${socket.id} joined room: ${room}`);
    });

    // Leave instructor room
    socket.on('leave-instructor', (sessionId) => {
      const room = `instructor-${sessionId}`;
      socket.leave(room);
      console.log(`🎓 Instructor ${socket.id} left room: ${room}`);
    });

    // ============================================
    // Queue System Rooms
    // ============================================

    // Join queue session room (for projector view, workers, etc.)
    socket.on('join-queue', (sessionId) => {
      const room = `queue-${sessionId}`;
      socket.join(room);
      console.log(`📋 Socket ${socket.id} joined queue room: ${room}`);
    });

    // Leave queue session room
    socket.on('leave-queue', (sessionId) => {
      const room = `queue-${sessionId}`;
      socket.leave(room);
      console.log(`📋 Socket ${socket.id} left queue room: ${room}`);
    });

    // Join worker room (for receiving task assignments)
    socket.on('join-worker', (userId) => {
      const room = `worker-${userId}`;
      socket.join(room);
      console.log(`👷 Worker ${socket.id} joined room: ${room}`);
    });

    // Leave worker room
    socket.on('leave-worker', (userId) => {
      const room = `worker-${userId}`;
      socket.leave(room);
      console.log(`👷 Worker ${socket.id} left room: ${room}`);
    });

    // Join booking room (for student to track their booking)
    socket.on('join-booking', (bookingId) => {
      const room = `booking-${bookingId}`;
      socket.join(room);
      console.log(`🎫 Socket ${socket.id} joined booking room: ${room}`);
    });

    // Leave booking room
    socket.on('leave-booking', (bookingId) => {
      const room = `booking-${bookingId}`;
      socket.leave(room);
      console.log(`🎫 Socket ${socket.id} left booking room: ${room}`);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id}, reason: ${reason}`);
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

// ============================================
// Queue System Emit Functions
// ============================================

/**
 * Emit to queue session room
 */
const emitToQueue = (sessionId, event, data) => {
  if (io) {
    io.to(`queue-${sessionId}`).emit(event, data);
  }
};

/**
 * Emit to specific worker
 */
const emitToWorker = (userId, event, data) => {
  if (io) {
    io.to(`worker-${userId}`).emit(event, data);
  }
};

/**
 * Emit to specific booking (student tracking)
 */
const emitToBooking = (bookingId, event, data) => {
  if (io) {
    io.to(`booking-${bookingId}`).emit(event, data);
  }
};

module.exports = {
  initializeSocket,
  getIO,
  // Attendance
  emitToAttendance,
  emitToInstructor,
  // Queue
  emitToQueue,
  emitToWorker,
  emitToBooking,
};
