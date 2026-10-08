import api from './api';

export const recommendationService = {
  /**
   * Get dynamic recommendations for logged in student
   * @param {Object} options
   * @param {boolean} options.forceRefresh
   * @param {number} options.limit
   */
  getRecommendations: async ({ forceRefresh = false, limit = 5 } = {}) => {
    const res = await api.get('/recommendations', {
      params: { forceRefresh, limit },
    });
    return res.data;
  },

  /**
   * Submit student feedback on a recommendation item
   * @param {Object} data
   * @param {string} data.itemId
   * @param {string} data.itemType ('alumni' | 'mentor' | 'job' | 'event')
   * @param {string} data.action ('like' | 'dismiss' | 'apply' | 'connect')
   * @param {string} data.feedback
   */
  submitFeedback: async (data) => {
    const res = await api.post('/recommendations/feedback', data);
    return res.data;
  },

  /**
   * Trigger embedding sync for alumni directory
   */
  syncEmbeddings: async () => {
    const res = await api.post('/alumni/directory/sync-embeddings');
    return res.data;
  },
};
