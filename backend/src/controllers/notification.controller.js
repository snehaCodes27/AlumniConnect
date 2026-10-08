const notificationService = require('../services/notification.service');

/**
 * GET /api/notifications
 */
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { page, limit, unreadOnly } = req.query;
    const result = await notificationService.getUserNotifications(userId, { page, limit, unreadOnly });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/notifications/unread-count
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const count = await notificationService.getUnreadCount(userId);

    return res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/:id/read
 */
const markNotificationRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const notification = await notificationService.markAsRead(userId, id);

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/read-all
 */
const markAllNotificationsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    await notificationService.markAllAsRead(userId);

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/notifications/:id
 */
const deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    await notificationService.deleteNotification(userId, id);

    return res.status(200).json({
      success: true,
      message: 'Notification deleted.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
};
