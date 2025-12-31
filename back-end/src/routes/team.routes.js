const express = require('express');
const router = express.Router({ mergeParams: true });
const teamController = require('../controllers/team.controller');
const { authenticate, authorize } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

// Get all teams for a course
router.get('/', authorize('admin', 'instructor', 'ta'), teamController.getTeams);

// Create a new team
router.post('/', authorize('admin', 'instructor', 'ta'), teamController.createTeam);

// Bulk create teams (for random formation)
router.post('/bulk', authorize('admin', 'instructor', 'ta'), teamController.bulkCreateTeams);

// Bulk delete teams
router.post('/bulk-delete', authorize('admin', 'instructor', 'ta'), teamController.bulkDeleteTeams);

// Update a team
router.put('/:teamId', authorize('admin', 'instructor', 'ta'), teamController.updateTeam);

// Delete a team
router.delete('/:teamId', authorize('admin', 'instructor', 'ta'), teamController.deleteTeam);

// Add member to team
router.post('/:teamId/members', authorize('admin', 'instructor', 'ta'), teamController.addMemberToTeam);

// Remove member from team
router.delete('/:teamId/members/:studentId', authorize('admin', 'instructor', 'ta'), teamController.removeMemberFromTeam);

module.exports = router;
