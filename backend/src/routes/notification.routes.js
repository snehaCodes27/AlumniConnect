const express = require('express');
const { authenticateToken } = require('../middleware/auth.middleware');
const {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} = require('../controllers/notification.controller');

const router = express.Router();

router.use(authenticateToken);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);
router.delete('/:id', deleteNotification);

module.exports = router;
