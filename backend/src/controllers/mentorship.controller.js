const mentorshipService = require('../services/mentorship.service');

/**
 * GET /api/mentorship/recommendations
 * Get intelligent mentor recommendations for calling student
 */
const getRecommendations = async (req, res, next) => {
  try {
    const studentUserId = req.user.userId;
    const { domain, skills, limit } = req.query;

    const data = await mentorshipService.getRecommendedMentors(studentUserId, {
      domain,
      skills,
      limit,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/mentorship/request
 * Send mentorship request
 */
const sendRequest = async (req, res, next) => {
  try {
    const studentId = req.user.userId;
    const { alumniId, topic, goals, message } = req.body;

    const request = await mentorshipService.sendMentorshipRequest({
      studentId,
      alumniId,
      topic,
      goals,
      message,
    });

    return res.status(201).json({
      success: true,
      message: 'Mentorship request sent successfully.',
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/mentorship/requests/:id/respond
 * Accept or Reject incoming mentorship request (Alumni)
 */
const respondRequest = async (req, res, next) => {
  try {
    const alumniId = req.user.userId;
    const { id } = req.params;
    const { status, responseNote } = req.body;

    const updated = await mentorshipService.respondToMentorshipRequest({
      alumniId,
      requestId: id,
      status,
      responseNote,
    });

    return res.status(200).json({
      success: true,
      message: `Mentorship request ${status === 'ACCEPTED' ? 'accepted' : 'declined'}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/mentorship/requests/:id/complete
 * Mark mentorship completed
 */
const completeMentorship = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const updated = await mentorshipService.completeMentorship({
      userId,
      requestId: id,
    });

    return res.status(200).json({
      success: true,
      message: 'Mentorship marked as completed.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/mentorship/requests/:id/cancel
 * Cancel pending request
 */
const cancelRequest = async (req, res, next) => {
  try {
    const studentId = req.user.userId;
    const { id } = req.params;

    const updated = await mentorshipService.cancelMentorshipRequest({
      studentId,
      requestId: id,
    });

    return res.status(200).json({
      success: true,
      message: 'Mentorship request cancelled.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mentorship/requests/received
 * Incoming mentorship requests for Alumni
 */
const getReceivedRequests = async (req, res, next) => {
  try {
    const alumniId = req.user.userId;
    const { status, page, limit } = req.query;

    const data = await mentorshipService.getReceivedMentorshipRequests(alumniId, {
      status,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mentorship/requests/sent
 * Sent mentorship requests for Student
 */
const getSentRequests = async (req, res, next) => {
  try {
    const studentId = req.user.userId;
    const { status, page, limit } = req.query;

    const data = await mentorshipService.getSentMentorshipRequests(studentId, {
      status,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mentorship/active
 * Active mentorships for user
 */
const getActiveMentorships = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const data = await mentorshipService.getActiveMentorships(userId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecommendations,
  sendRequest,
  respondRequest,
  completeMentorship,
  cancelRequest,
  getReceivedRequests,
  getSentRequests,
  getActiveMentorships,
};
