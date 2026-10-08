const adminService = require('../services/admin.service');
const adminAnalyticsService = require('../services/adminAnalytics.service');

/**
 * Get list of pending users
 */
const getPendingUsers = async (req, res, next) => {
  try {
    const pendingUsers = await adminService.getPendingUsers();
    return res.status(200).json({
      success: true,
      data: pendingUsers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve a user
 */
const approveUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedUser = await adminService.approveUser(id);
    return res.status(200).json({
      success: true,
      message: 'User account approved successfully.',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject a user
 */
const rejectUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedUser = await adminService.rejectUser(id);
    return res.status(200).json({
      success: true,
      message: 'User account rejected.',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get full admin dashboard analytics summary
 */
const getDashboardSummary = async (req, res, next) => {
  try {
    const data = await adminAnalyticsService.getDashboardSummary();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * Get KPI stats cards
 */
const getKpiStats = async (req, res, next) => {
  try {
    const data = await adminAnalyticsService.getKpiStats();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recent activity feed
 */
const getRecentActivity = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await adminAnalyticsService.getRecentActivity(limit);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * Get upcoming events
 */
const getUpcomingEvents = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const data = await adminAnalyticsService.getUpcomingEvents(limit);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * Get top companies by applications
 */
const getTopCompanies = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const data = await adminAnalyticsService.getTopCompaniesByApplications(limit);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPendingUsers,
  approveUser,
  rejectUser,
  getDashboardSummary,
  getKpiStats,
  getRecentActivity,
  getUpcomingEvents,
  getTopCompanies,
};
