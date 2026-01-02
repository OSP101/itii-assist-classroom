const express = require('express');
const router = express.Router();
const scoreEditRequestController = require('../controllers/scoreEditRequest.controller');
const { authenticate, authorize } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

// Get edit requests for a course (instructor only)
router.get('/', scoreEditRequestController.getEditRequests);

// Get pending count for a course (instructor only)
router.get('/pending-count', scoreEditRequestController.getPendingCount);

// Create edit request (TA)
router.post('/', scoreEditRequestController.createEditRequest);

// Approve edit request (instructor only)
router.post('/:id/approve', scoreEditRequestController.approveEditRequest);

// Reject edit request (instructor only)
router.post('/:id/reject', scoreEditRequestController.rejectEditRequest);

module.exports = router;
