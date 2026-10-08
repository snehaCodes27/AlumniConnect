const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const studentProfileRoutes = require('./studentProfile.routes');
const alumniProfileRoutes = require('./alumniProfile.routes');
const alumniDirectoryRoutes = require('./alumniDirectory.routes');
const connectionRoutes = require('./connection.routes');
const mentorshipRoutes = require('./mentorship.routes');
const notificationRoutes = require('./notification.routes');
const jobRoutes = require('./job.routes');
const eventRoutes = require('./event.routes');
const recommendationRoutes = require('./recommendation.routes');
const chatRoutes = require('./chat.routes');
const communityRoutes = require('./community.routes');
const gamificationRoutes = require('./gamification.routes');

const router = express.Router();

// Mount route modules
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/student/profile', studentProfileRoutes);
router.use('/alumni/profile', alumniProfileRoutes);
router.use('/alumni/directory', alumniDirectoryRoutes);
router.use('/connections', connectionRoutes);
router.use('/mentorship', mentorshipRoutes);
router.use('/notifications', notificationRoutes);
router.use('/jobs', jobRoutes);
router.use('/events', eventRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/chat', chatRoutes);
router.use('/communities', communityRoutes);
router.use('/gamification', gamificationRoutes);

module.exports = router;
