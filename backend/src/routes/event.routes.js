const express = require('express');
const { authenticateToken, authorizeRoles, optionalAuthenticateToken } = require('../middleware/auth.middleware');
const eventController = require('../controllers/event.controller');

const router = express.Router();

// ── Public / Optional Auth Routes ──────────────────────────────────────────────
router.get('/', optionalAuthenticateToken, eventController.getEvents);
router.get('/:id', optionalAuthenticateToken, eventController.getEventDetails);

// ── Authenticated Routes ───────────────────────────────────────────────────────
router.use(authenticateToken);

// User / Student Registration Routes
router.get('/registrations/my', eventController.getUserRegistrations);
router.post('/:id/register', eventController.registerForEvent);
router.delete('/:id/register', eventController.cancelRegistration);

// Alumni / Admin Management Routes
router.post('/', authorizeRoles('ALUMNI', 'ADMIN'), eventController.createEvent);
router.put('/:id', authorizeRoles('ALUMNI', 'ADMIN'), eventController.updateEvent);
router.patch('/:id/cancel', authorizeRoles('ALUMNI', 'ADMIN'), eventController.cancelEvent);
router.delete('/:id', authorizeRoles('ALUMNI', 'ADMIN'), eventController.deleteEvent);
router.get('/:id/registrants', authorizeRoles('ALUMNI', 'ADMIN'), eventController.getEventRegistrants);
router.get('/:id/invitable-students', authorizeRoles('ALUMNI', 'ADMIN'), eventController.getInvitableStudents);
router.post('/:id/notify', authorizeRoles('ALUMNI', 'ADMIN'), eventController.sendEventNotification);

// ── Automatic Private Event Community Routes ────────────────────────────────
router.get('/:id/community', eventController.getEventCommunity);
router.post('/:id/community/posts', eventController.createCommunityPost);
router.put('/:id/community/meeting-link', authorizeRoles('ALUMNI', 'ADMIN'), eventController.updateMeetingLink);
router.delete('/:id/community/posts/:postId', eventController.deleteCommunityPost);

// ── Webinar Recording, Transcript, AI Extraction & RAG Routes ───────────────
router.get('/:id/recording', eventController.getEventRecording);
router.post('/:id/recording', authorizeRoles('ALUMNI', 'ADMIN'), eventController.saveEventRecording);
router.post('/:id/recording/ask-ai', eventController.queryEventRecordingRag);
router.delete('/:id/recording', authorizeRoles('ALUMNI', 'ADMIN'), eventController.deleteEventRecording);

module.exports = router;

