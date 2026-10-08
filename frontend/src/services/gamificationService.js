import api from './api';

export const gamificationService = {
  /**
   * Get ranked alumni leaderboard
   */
  async getLeaderboard(params = {}) {
    const res = await api.get('/gamification/leaderboard', { params });
    return res.data;
  },

  /**
   * Get current user's gamification profile, rank, badges, and audit history
   */
  async getMyProfile() {
    const res = await api.get('/gamification/profile/me');
    return res.data;
  },

  /**
   * Get public gamification profile for specific user
   */
  async getUserProfile(userId) {
    const res = await api.get(`/gamification/profile/${userId}`);
    return res.data;
  },

  /**
   * Synchronize historical contributions from PostgreSQL activities
   */
  async syncHistory() {
    const res = await api.post('/gamification/sync-history');
    return res.data;
  },
};

export default gamificationService;
