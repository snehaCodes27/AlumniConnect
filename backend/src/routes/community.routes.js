const express = require('express');
const { authenticateToken, authorizeRoles, optionalAuthenticateToken } = require('../middleware/auth.middleware');
const communityController = require('../controllers/community.controller');

const router = express.Router();

// Public / optionally authenticated routes (discovering communities & posts)
router.get('/', optionalAuthenticateToken, communityController.getCommunities);
router.get('/:slug', optionalAuthenticateToken, communityController.getCommunityBySlug);
router.get('/:id/posts', optionalAuthenticateToken, communityController.getCommunityPosts);
router.get('/posts/:postId', optionalAuthenticateToken, communityController.getPostDetails);
router.get('/:id/members', communityController.getCommunityMembers);

// Authenticated routes (requires student, alumni, or admin)
router.use(authenticateToken);
router.use(authorizeRoles('STUDENT', 'ALUMNI', 'ADMIN'));

// Membership
router.post('/:id/join', communityController.joinCommunity);
router.post('/:id/leave', communityController.leaveCommunity);

// Posting & Discussion
router.post('/:id/posts', communityController.createPost);
router.post('/posts/:postId/comments', communityController.createComment);
router.post('/posts/:postId/like', communityController.toggleLikePost);

// Moderation (pin, lock, hide, delete)
router.patch('/posts/:postId/moderate', communityController.moderatePost);

module.exports = router;
