const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');
const mentorshipController = require('../controllers/mentorship.controller');

const router = express.Router();

// All mentorship routes require authentication
router.use(authenticateToken);

// GET /api/mentorship/recommendations - Intelligent ranked mentor recommendations (Students, Alumni, Admin)
router.get('/recommendations', authorizeRoles('STUDENT', 'ALUMNI', 'ADMIN'), mentorshipController.getRecommendations);

// POST /api/mentorship/request - Send mentorship request (Students, Alumni, Admin)
router.post('/request', authorizeRoles('STUDENT', 'ALUMNI', 'ADMIN'), mentorshipController.sendRequest);

// GET /api/mentorship/requests/sent - Sent mentorship requests (Students)
router.get('/requests/sent', authorizeRoles('STUDENT', 'ALUMNI', 'ADMIN'), mentorshipController.getSentRequests);

// GET /api/mentorship/requests/received - Received mentorship requests (Alumni)
router.get('/requests/received', authorizeRoles('ALUMNI', 'ADMIN'), mentorshipController.getReceivedRequests);

// PATCH /api/mentorship/requests/:id/respond - Accept/Reject mentorship request (Alumni)
router.patch('/requests/:id/respond', authorizeRoles('ALUMNI', 'ADMIN'), mentorshipController.respondRequest);

// PATCH /api/mentorship/requests/:id/complete - Complete mentorship (Both roles)
router.patch('/requests/:id/complete', authorizeRoles('STUDENT', 'ALUMNI', 'ADMIN'), mentorshipController.completeMentorship);

// DELETE /api/mentorship/requests/:id/cancel - Cancel pending request (Students)
router.delete('/requests/:id/cancel', authorizeRoles('STUDENT', 'ADMIN'), mentorshipController.cancelRequest);

// GET /api/mentorship/active - Active mentorships (Both roles)
router.get('/active', authorizeRoles('STUDENT', 'ALUMNI', 'ADMIN'), mentorshipController.getActiveMentorships);

module.exports = router;