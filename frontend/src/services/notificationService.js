import api from './api';

export const notificationService = {
  // Get paginated notifications
  async getNotifications(params = {}) {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  // Get count of unread notifications
  async getUnreadCount() {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  // Mark single notification as read
  async markAsRead(id) {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  // Mark all notifications as read
  async markAllAsRead() {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  },

  // Delete notification
  async deleteNotification(id) {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },
};

export default notificationService;
