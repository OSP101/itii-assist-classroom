const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course.controller');
const { authenticate, authorize } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

// Get instructors/TAs list for dropdown (admin only)
router.get('/instructors', authorize('admin'), courseController.getInstructors);
router.get('/tas-list', authorize('admin'), courseController.getTAsList);

// My courses (for instructor/TA)
router.get('/my-courses', authorize('instructor', 'ta'), courseController.getMyCourses);
router.get('/my-courses/stats', authorize('instructor', 'ta'), courseController.getMyCoursesStats);

// Course stats
router.get('/stats', authorize('admin', 'instructor'), courseController.getCourseStats);

// Course CRUD
router.get('/', authorize('admin', 'instructor', 'ta'), courseController.getCourses);
router.get('/:id', authorize('admin', 'instructor', 'ta'), courseController.getCourseById);
router.post('/', authorize('admin', 'instructor'), courseController.createCourse);
router.put('/:id', authorize('admin', 'instructor'), courseController.updateCourse);
router.delete('/:id', authorize('admin'), courseController.deleteCourse);
router.patch('/:id/toggle-status', authorize('admin', 'instructor'), courseController.toggleCourseStatus);

// Section management (admin only)
router.post('/:id/sections', authorize('admin'), courseController.addSection);
router.delete('/:id/sections/:sectionId', authorize('admin'), courseController.removeSection);

// TA management (admin only)
router.post('/:id/tas', authorize('admin'), courseController.addTA);
router.delete('/:id/tas/:userId', authorize('admin'), courseController.removeTA);

// Student management in sections
router.get('/:id/sections/:sectionId/students', authorize('admin', 'instructor', 'ta'), courseController.getSectionStudents);
router.post('/:id/sections/:sectionId/students', authorize('admin'), courseController.addStudentToSection);
router.delete('/:id/sections/:sectionId/students/:studentId', authorize('admin'), courseController.removeStudentFromSection);

module.exports = router;
