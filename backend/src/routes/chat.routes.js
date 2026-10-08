const express = require('express');
const { authenticateToken } = require('../middleware/auth.middleware');
const {
  getConversations,
  startConversation,
  getMessages,
  postMessage,
  markAsRead,
  getUnreadCount,
  getContacts,
} = require('../controllers/chat.controller');

const router = express.Router();

router.use(authenticateToken);

// Conversation list and initiation
router.get('/conversations', getConversations);
router.post('/conversations', startConversation);

// Messages inside a conversation
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', postMessage);
router.patch('/conversations/:id/read', markAsRead);

// Helper endpoints
router.get('/unread-count', getUnreadCount);
router.get('/contacts', getContacts);

module.exports = router;
