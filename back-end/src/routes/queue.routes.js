/**
 * Queue Routes
 * ระบบจองคิวตรวจงาน
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const queueController = require('../controllers/queue.controller');
const { authenticate, authorize } = require('../middlewares/auth');

// ============================================
// Public Routes (for students)
// ============================================

// Verify PIN code
router.post('/verify-pin', queueController.verifyPIN);

// Create booking (student)
router.post('/bookings', queueController.createBooking);

// Get booking status
router.get('/bookings/:bookingId/status', queueController.getBookingStatus);

// ============================================
// Projector View (public for display)
// ============================================

router.get('/sessions/:sessionId/desk-statuses', queueController.getDeskStatuses);

// ============================================
// Protected Routes (Instructor/TA)
// ============================================

// Queue Sessions for a course
router.get(
    '/sessions',
    authenticate,
    authorize('admin', 'instructor', 'ta'),
    queueController.getQueueSessions
);

router.post(
    '/sessions',
    authenticate,
    authorize('admin', 'instructor', 'ta'),
    queueController.createQueueSession
);

// Single session management
router.get(
    '/sessions/:sessionId',
    authenticate,
    authorize('admin', 'instructor', 'ta'),
    queueController.getQueueSession
);

router.put(
    '/sessions/:sessionId',
    authenticate,
    authorize('admin', 'instructor', 'ta'),
    queueController.updateQueueSession
);

router.post(
    '/sessions/:sessionId/status',
    authenticate,
    authorize('admin', 'instructor', 'ta'),
    queueController.updateQueueSessionStatus
);

router.delete(
    '/sessions/:sessionId',
    authenticate,
    authorize('admin', 'instructor', 'ta'),
    queueController.deleteQueueSession
);

router.post(
    '/sessions/:sessionId/regenerate-pin',
    authenticate,
    authorize('admin', 'instructor', 'ta'),
    queueController.regeneratePIN
);

// ============================================
// Worker Management
// ============================================

router.post(
    '/sessions/:sessionId/workers/join',
    authenticate,
    authorize('admin', 'instructor', 'ta'),
    queueController.joinAsWorker
);

router.post(
    '/sessions/:sessionId/workers/leave',
    authenticate,
    authorize('admin', 'instructor', 'ta'),
    queueController.leaveAsWorker
);

router.get(
    '/sessions/:sessionId/workers',
    authenticate,
    authorize('admin', 'instructor', 'ta'),
    queueController.getWorkers
);

// ============================================
// Booking Management (for workers)
// ============================================

router.get(
    '/sessions/:sessionId/bookings',
    authenticate,
    authorize('admin', 'instructor', 'ta'),
    queueController.getSessionBookings
);

router.post(
    '/sessions/:sessionId/bookings/:bookingId/complete',
    authenticate,
    authorize('admin', 'instructor', 'ta'),
    queueController.completeBooking
);

router.post(
    '/sessions/:sessionId/bookings/:bookingId/skip',
    authenticate,
    authorize('admin', 'instructor', 'ta'),
    queueController.skipBooking
);

module.exports = router;
