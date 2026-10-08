const gamificationService = require('../services/gamification.service');

/**
 * GET /api/gamification/leaderboard
 * Ranked leaderboard of alumni contributors
 */
const getLeaderboard = async (req, res, next) => {
  try {
    const { page, limit } = req.query;

    const data = await gamificationService.getLeaderboard({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 25,
    });

    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/gamification/profile/me
 * Current user's gamification profile, rank, badges, and point logs
 */
const getMyGamificationProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const data = await gamificationService.getUserGamificationProfile(userId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/gamification/profile/:userId
 * Public gamification profile for specific user
 */
const getUserGamificationProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const data = await gamificationService.getUserGamificationProfile(userId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/gamification/sync-history
 * Synchronize real historical contributions from PostgreSQL activities
 */
const syncHistoricalContributions = async (req, res, next) => {
  try {
    await gamificationService.syncHistoricalContributions();

    return res.status(200).json({
      success: true,
      message: 'Gamification historical activities audited and synchronized successfully.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getLeaderboard,
  getMyGamificationProfile,
  getUserGamificationProfile,
  syncHistoricalContributions,
};
