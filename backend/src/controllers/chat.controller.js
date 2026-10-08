const chatService = require('../services/chat.service');

/**
 * GET /api/chat/conversations
 * Get all conversations for the authenticated user
 */
const getConversations = async (req, res, next) => {
  try {
    const currentUserId = req.user.userId;
    const conversations = await chatService.getUserConversations(currentUserId);
    return res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/chat/conversations
 * Get or create a conversation with a connected user
 */
const startConversation = async (req, res, next) => {
  try {
    const currentUserId = req.user.userId;
    const { otherUserId } = req.body;

    if (!otherUserId) {
      return res.status(400).json({
        success: false,
        message: 'otherUserId is required.',
      });
    }

    const conversation = await chatService.getOrCreateConversation(currentUserId, otherUserId);
    return res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/conversations/:id/messages
 * Get message history for a conversation
 */
const getMessages = async (req, res, next) => {
  try {
    const currentUserId = req.user.userId;
    const conversationId = req.params.id;
    const { page, limit } = req.query;

    const result = await chatService.getConversationMessages(conversationId, currentUserId, {
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/chat/conversations/:id/messages
 * Send a message in a conversation
 */
const postMessage = async (req, res, next) => {
  try {
    const currentUserId = req.user.userId;
    const conversationId = req.params.id;
    const { content } = req.body;

    const message = await chatService.sendMessage({
      conversationId,
      senderId: currentUserId,
      content,
    });

    return res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/chat/conversations/:id/read
 * Mark messages in a conversation as read
 */
const markAsRead = async (req, res, next) => {
  try {
    const currentUserId = req.user.userId;
    const conversationId = req.params.id;

    const result = await chatService.markConversationRead(conversationId, currentUserId);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/unread-count
 * Get total unread messages count across all conversations
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const currentUserId = req.user.userId;
    const unreadCount = await chatService.getTotalUnreadCount(currentUserId);
    return res.status(200).json({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/contacts
 * Get list of all connected contacts eligible to message
 */
const getContacts = async (req, res, next) => {
  try {
    const currentUserId = req.user.userId;
    const contacts = await chatService.getChatEligibleContacts(currentUserId);
    return res.status(200).json({
      success: true,
      data: contacts,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConversations,
  startConversation,
  getMessages,
  postMessage,
  markAsRead,
  getUnreadCount,
  getContacts,
};
