import api from './api';

export const connectionService = {
  // Send connection request
  async sendRequest(receiverId, message = '') {
    const response = await api.post('/connections/request', { receiverId, message });
    return response.data;
  },

  // Accept or Reject request
  async respondRequest(connectionId, status) {
    const response = await api.patch(`/connections/${connectionId}/respond`, { status });
    return response.data;
  },

  // Withdraw sent request
  async withdrawRequest(connectionId) {
    const response = await api.delete(`/connections/${connectionId}/withdraw`);
    return response.data;
  },

  // Get received requests (for alumni/users)
  async getReceivedRequests(params = {}) {
    const response = await api.get('/connections/received', { params });
    return response.data;
  },

  // Get sent requests (for students/users)
  async getSentRequests(params = {}) {
    const response = await api.get('/connections/sent', { params });
    return response.data;
  },

  // Get accepted connections list
  async getMyConnections(params = {}) {
    const response = await api.get('/connections', { params });
    return response.data;
  },

  // Batch check statuses for an array of user IDs
  async getStatusesMap(userIds = []) {
    const response = await api.post('/connections/statuses', { userIds });
    return response.data;
  },
};

export default connectionService;
