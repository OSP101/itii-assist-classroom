const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const systemRoutes = require('./system.routes');
const systemLogRoutes = require('./systemLog.routes');
const userRoutes = require('./user.routes');
const studentRoutes = require('./student.routes');
const courseRoutes = require('./course.routes');
const classroomRoutes = require('./classroom.routes');
const feedbackRoutes = require('./feedback.routes');
const teamRoutes = require('./team.routes');
const assignmentRoutes = require('./assignment.routes');
const scoreRoutes = require('./score.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/system', systemRoutes);
router.use('/logs', systemLogRoutes);
router.use('/users', userRoutes);
router.use('/students', studentRoutes);
router.use('/courses', courseRoutes);
router.use('/courses/:id/teams', teamRoutes); // Team routes nested under courses
router.use('/classrooms', classroomRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/scores', scoreRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
