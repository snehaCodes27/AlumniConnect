const recommendationService = require('../services/recommendation.service');

/**
 * GET /api/recommendations
 * Dynamic, AI-powered recommendations for logged-in students
 * Returns tailored alumni, mentors, jobs, and events
 */
const getRecommendations = async (req, res, next) => {
  try {
    const studentUserId = req.user.userId;
    const { forceRefresh = 'false', limit = '5' } = req.query;

    const shouldRefresh = forceRefresh === 'true';
    const limitNum = Math.min(20, Math.max(1, parseInt(limit, 10) || 5));

    const recommendations = await recommendationService.getStudentRecommendations(
      studentUserId,
      {
        forceRefresh: shouldRefresh,
        limit: limitNum,
      }
    );

    return res.status(200).json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/recommendations/feedback
 * Submit feedback on recommendations
 */
const postRecommendationFeedback = async (req, res, next) => {
  try {
    const studentUserId = req.user.userId;
    const { itemId, itemType, action, feedback } = req.body;

    const result = await recommendationService.recordRecommendationFeedback(
      studentUserId,
      { itemId, itemType, action, feedback }
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecommendations,
  postRecommendationFeedback,
};
