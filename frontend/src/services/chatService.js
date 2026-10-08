import api from './api';

export const chatService = {
  /**
   * Get all conversations for current user
   */
  getConversations: async () => {
    const res = await api.get('/chat/conversations');
    return res.data;
  },

  /**
   * Start or retrieve a conversation with a connected user
   * @param {string} otherUserId
   */
  startConversation: async (otherUserId) => {
    const res = await api.post('/chat/conversations', { otherUserId });
    return res.data;
  },

  /**
   * Get messages for a specific conversation
   * @param {string} conversationId
   * @param {Object} options
   * @param {number} options.page
   * @param {number} options.limit
   */
  getMessages: async (conversationId, { page = 1, limit = 50 } = {}) => {
    const res = await api.get(`/chat/conversations/${conversationId}/messages`, {
      params: { page, limit },
    });
    return res.data;
  },

  /**
   * Send a new message in a conversation
   * @param {string} conversationId
   * @param {string} content
   */
  sendMessage: async (conversationId, content) => {
    const res = await api.post(`/chat/conversations/${conversationId}/messages`, {
      content,
    });
    return res.data;
  },

  /**
   * Mark messages in conversation as read
   * @param {string} conversationId
   */
  markAsRead: async (conversationId) => {
    const res = await api.patch(`/chat/conversations/${conversationId}/read`);
    return res.data;
  },

  /**
   * Get total unread count across all conversations
   */
  getUnreadCount: async () => {
    const res = await api.get('/chat/unread-count');
    return res.data;
  },

  /**
   * Get all connected contacts eligible to chat with
   */
  getContacts: async () => {
    const res = await api.get('/chat/contacts');
    return res.data;
  },
};
