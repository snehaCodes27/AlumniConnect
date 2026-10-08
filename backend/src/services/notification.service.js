const prisma = require('../config/prisma');
const { emitToUser } = require('../socket');

/**
 * Create a persistent notification in PostgreSQL and emit a real-time event via Socket.IO
 */
const createNotification = async ({ userId, actorId = null, type = 'SYSTEM', title, message, data = null }) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        actorId,
        type,
        title,
        message,
        data: data || {},
      },
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            role: true,
          },
        },
      },
    });

    // Real-time delivery via Socket.IO
    emitToUser(userId, 'notification:new', notification);

    // Also emit unread count update
    const unreadCount = await getUnreadCount(userId);
    emitToUser(userId, 'notification:count', { count: unreadCount });

    return notification;
  } catch (error) {
    console.error('[Notification Service Error] createNotification:', error);
    throw error;
  }
};

/**
 * Get paginated notifications for a user
 */
const getUserNotifications = async (userId, { page = 1, limit = 20, unreadOnly = false } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  const where = { userId };
  if (unreadOnly === true || unreadOnly === 'true') {
    where.isRead = false;
  }

  const [total, unreadCount, notifications] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.notification.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Get count of unread notifications
 */
const getUnreadCount = async (userId) => {
  return await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
};

/**
 * Mark a specific notification as read
 */
const markAsRead = async (userId, notificationId) => {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });

  if (!notification) {
    const error = new Error('Notification not found.');
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  const unreadCount = await getUnreadCount(userId);
  emitToUser(userId, 'notification:count', { count: unreadCount });

  return updated;
};

/**
 * Mark all notifications as read for a user
 */
const markAllAsRead = async (userId) => {
  await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  emitToUser(userId, 'notification:count', { count: 0 });

  return { success: true };
};

/**
 * Delete a notification
 */
const deleteNotification = async (userId, notificationId) => {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });

  if (!notification) {
    const error = new Error('Notification not found.');
    error.statusCode = 404;
    throw error;
  }

  await prisma.notification.delete({
    where: { id: notificationId },
  });

  const unreadCount = await getUnreadCount(userId);
  emitToUser(userId, 'notification:count', { count: unreadCount });

  return { success: true };
};

module.exports = {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
