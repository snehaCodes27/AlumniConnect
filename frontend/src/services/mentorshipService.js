import api from './api';

/**
 * Mentorship API Service - wraps all backend mentorship endpoints
 * Used for real ranked recommendations, request workflow, and inbox management.
 */
export const mentorshipService = {
  /**
   * GET /api/mentorship/recommendations
   * Returns ranked mentor matches with 0-100% matching score and explanations.
   * @param {Object} params - Optional filters { domain, skills, limit }
   */
  async getRecommendations(params = {}) {
    const response = await api.get('/mentorship/recommendations', { params });
    return response.data;
  },

  /**
   * POST /api/mentorship/request
   * Send a mentorship request to an alumni.
   * @param {Object} data - { alumniId, topic, goals, message }
   */
  async sendRequest(data) {
    const response = await api.post('/mentorship/request', data);
    return response.data;
  },

  /**
   * PATCH /api/mentorship/requests/:id/respond
   * Alumni accepts or rejects a mentorship request.
   * @param {string} requestId
   * @param {string} status - 'ACCEPTED' | 'REJECTED'
   * @param {string} responseNote
   */
  async respondRequest(requestId, status, responseNote = '') {
    const response = await api.patch(`/mentorship/requests/${requestId}/respond`, {
      status,
      responseNote,
    });
    return response.data;
  },

  /**
   * PATCH /api/mentorship/requests/:id/complete
   * Mark an accepted mentorship as completed.
   */
  async completeMentorship(requestId) {
    const response = await api.patch(`/mentorship/requests/${requestId}/complete`);
    return response.data;
  },

  /**
   * DELETE /api/mentorship/requests/:id/cancel
   * Cancel a pending mentorship request (Student only).
   */
  async cancelRequest(requestId) {
    const response = await api.delete(`/mentorship/requests/${requestId}/cancel`);
    return response.data;
  },

  /**
   * GET /api/mentorship/requests/sent
   * Fetch paginated sent mentorship requests (Student).
   */
  async getSentRequests(params = {}) {
    const response = await api.get('/mentorship/requests/sent', { params });
    return response.data;
  },

  /**
   * GET /api/mentorship/requests/received
   * Fetch paginated received mentorship requests (Alumni).
   */
  async getReceivedRequests(params = {}) {
    const response = await api.get('/mentorship/requests/received', { params });
    return response.data;
  },

  /**
   * GET /api/mentorship/active
   * Fetch all active (ACCEPTED) mentorships for the current user.
   */
  async getActiveMentorships() {
    const response = await api.get('/mentorship/active');
    return response.data;
  },
};

export default mentorshipService;