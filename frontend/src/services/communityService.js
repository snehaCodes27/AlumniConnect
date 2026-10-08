import api from './api';

export const communityService = {
  /**
   * Get all communities with domain filter and search
   */
  async getCommunities(params = {}) {
    const res = await api.get('/communities', { params });
    return res.data;
  },

  /**
   * Get community details by slug
   */
  async getCommunityBySlug(slug) {
    const res = await api.get(`/communities/${slug}`);
    return res.data;
  },

  /**
   * Join a community
   */
  async joinCommunity(communityId) {
    const res = await api.post(`/communities/${communityId}/join`);
    return res.data;
  },

  /**
   * Leave a community
   */
  async leaveCommunity(communityId) {
    const res = await api.post(`/communities/${communityId}/leave`);
    return res.data;
  },

  /**
   * Get members of a community
   */
  async getMembers(communityId, params = {}) {
    const res = await api.get(`/communities/${communityId}/members`, { params });
    return res.data;
  },

  /**
   * Get posts in a community
   */
  async getPosts(communityId, params = {}) {
    const res = await api.get(`/communities/${communityId}/posts`, { params });
    return res.data;
  },

  /**
   * Create a post in a community
   */
  async createPost(communityId, data) {
    const res = await api.post(`/communities/${communityId}/posts`, data);
    return res.data;
  },

  /**
   * Get post details with replies
   */
  async getPostDetails(postId) {
    const res = await api.get(`/communities/posts/${postId}`);
    return res.data;
  },

  /**
   * Create a comment or threaded reply
   */
  async createComment(postId, data) {
    const res = await api.post(`/communities/posts/${postId}/comments`, data);
    return res.data;
  },

  /**
   * Toggle like on a post
   */
  async toggleLikePost(postId) {
    const res = await api.post(`/communities/posts/${postId}/like`);
    return res.data;
  },

  /**
   * Moderate a post (Pin, Lock, Status)
   */
  async moderatePost(postId, data) {
    const res = await api.patch(`/communities/posts/${postId}/moderate`, data);
    return res.data;
  },
};

export default communityService;
