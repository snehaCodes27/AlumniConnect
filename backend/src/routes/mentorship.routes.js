const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');
const mentorshipController = require('../controllers/mentorship.controller');

const router = express.Router();

// All mentorship routes require authentication
router.use(authenticateToken);

// GET /api/mentorship/recommendations - Intelligent ranked mentor recommendations (Students)
router.get('/recommendations', authorizeRoles('STUDENT'), mentorshipController.getRecommendations);

// POST /api/mentorship/request - Send mentorship request (Students)
router.post('/request', authorizeRoles('STUDENT'), mentorshipController.sendRequest);

// GET /api/mentorship/requests/sent - Sent mentorship requests (Students)
router.get('/requests/sent', authorizeRoles('STUDENT'), mentorshipController.getSentRequests);

// GET /api/mentorship/requests/received - Received mentorship requests (Alumni)
router.get('/requests/received', authorizeRoles('ALUMNI'), mentorshipController.getReceivedRequests);

// PATCH /api/mentorship/requests/:id/respond - Accept/Reject mentorship request (Alumni)
router.patch('/requests/:id/respond', authorizeRoles('ALUMNI'), mentorshipController.respondRequest);

// PATCH /api/mentorship/requests/:id/complete - Complete mentorship (Both roles)
router.patch('/requests/:id/complete', authorizeRoles('STUDENT', 'ALUMNI'), mentorshipController.completeMentorship);

// DELETE /api/mentorship/requests/:id/cancel - Cancel pending request (Students)
router.delete('/requests/:id/cancel', authorizeRoles('STUDENT'), mentorshipController.cancelRequest);

// GET /api/mentorship/active - Active mentorships (Both roles)
router.get('/active', authorizeRoles('STUDENT', 'ALUMNI'), mentorshipController.getActiveMentorships);

module.exports = router;