const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');
const {
  getRecommendations,
  postRecommendationFeedback,
} = require('../controllers/recommendation.controller');

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles('STUDENT'));

// GET /api/recommendations?forceRefresh=false&limit=5
router.get('/', getRecommendations);

// POST /api/recommendations/feedback
router.post('/feedback', postRecommendationFeedback);

module.exports = router;
