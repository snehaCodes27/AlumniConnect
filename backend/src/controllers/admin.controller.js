const adminService = require('../services/admin.service');

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

module.exports = {
  getPendingUsers,
  approveUser,
  rejectUser,
};
