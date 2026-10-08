const communityService = require('../services/community.service');

/**
 * GET /api/communities
 * List all discoverable domain/career communities
 */
const getCommunities = async (req, res, next) => {
  try {
    const { domain, search, page, limit } = req.query;
    const userId = req.user ? req.user.userId : null;

    const data = await communityService.getCommunities({
      domain,
      search,
      userId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/communities/:slug
 * Get community details by slug
 */
const getCommunityBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const userId = req.user ? req.user.userId : null;

    const community = await communityService.getCommunityBySlug(slug, userId);

    return res.status(200).json({
      success: true,
      data: community,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/communities/:id/join
 * Join a community
 */
const joinCommunity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await communityService.joinCommunity(id, userId);

    return res.status(200).json({
      success: true,
      message: 'Successfully joined community',
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/communities/:id/leave
 * Leave a community
 */
const leaveCommunity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await communityService.leaveCommunity(id, userId);

    return res.status(200).json({
      success: true,
      message: 'Successfully left community',
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/communities/:id/members
 * Get members of a community
 */
const getCommunityMembers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page, limit, role } = req.query;

    const data = await communityService.getCommunityMembers(id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 30,
      role: role || null,
    });

    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/communities/:id/posts
 * Get posts for a community
 */
const getCommunityPosts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.userId : null;
    const { type, search, page, limit } = req.query;

    const data = await communityService.getCommunityPosts(id, userId, {
      type: type || null,
      search: search || '',
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/communities/:id/posts
 * Create a new discussion or resource post
 */
const createPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const authorId = req.user.userId;
    const { type, title, content, linkUrl, tags } = req.body;

    const post = await communityService.createPost({
      communityId: id,
      authorId,
      type,
      title,
      content,
      linkUrl,
      tags,
    });

    return res.status(201).json({
      success: true,
      message: 'Community post created successfully',
      data: post,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/communities/posts/:postId
 * Get post details with replies
 */
const getPostDetails = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const userId = req.user ? req.user.userId : null;

    const post = await communityService.getPostDetails(postId, userId);

    return res.status(200).json({
      success: true,
      data: post,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/communities/posts/:postId/comments
 * Add comment or threaded reply
 */
const createComment = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const authorId = req.user.userId;
    const { parentId, content } = req.body;

    const comment = await communityService.createComment({
      postId,
      authorId,
      parentId: parentId || null,
      content,
    });

    return res.status(201).json({
      success: true,
      message: 'Comment posted',
      data: comment,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/communities/posts/:postId/like
 * Toggle like on a post
 */
const toggleLikePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    const result = await communityService.toggleLikePost(postId, userId);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/communities/posts/:postId/moderate
 * Moderate post (pin, lock, status)
 */
const moderatePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const moderatorId = req.user.userId;
    const { status, isPinned, isLocked } = req.body;

    const updated = await communityService.moderatePost({
      postId,
      moderatorId,
      status,
      isPinned,
      isLocked,
    });

    return res.status(200).json({
      success: true,
      message: 'Post moderation updated',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCommunities,
  getCommunityBySlug,
  joinCommunity,
  leaveCommunity,
  getCommunityMembers,
  getCommunityPosts,
  createPost,
  getPostDetails,
  createComment,
  toggleLikePost,
  moderatePost,
};
