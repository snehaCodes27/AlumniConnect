const express = require('express');
const { authenticateToken, authorizeRoles, optionalAuthenticateToken } = require('../middleware/auth.middleware');
const gamificationController = require('../controllers/gamification.controller');

const router = express.Router();

// Public / optionally authenticated leaderboard
router.get('/leaderboard', optionalAuthenticateToken, gamificationController.getLeaderboard);

// Public profile for any user
router.get('/profile/:userId', optionalAuthenticateToken, gamificationController.getUserGamificationProfile);

// Authenticated routes
router.use(authenticateToken);

// Current user's gamification profile and audit history
router.get('/profile/me', gamificationController.getMyGamificationProfile);

// Sync historical contributions
router.post('/sync-history', authorizeRoles('ALUMNI', 'ADMIN'), gamificationController.syncHistoricalContributions);

module.exports = router;
