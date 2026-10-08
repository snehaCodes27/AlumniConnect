const eventService = require('../services/event.service');

const createEvent = async (req, res) => {
  try {
    const creatorId = req.user.userId;
    const event = await eventService.createEvent(creatorId, req.body);
    return res.status(201).json({
      success: true,
      message: 'Event created successfully.',
      data: event,
    });
  } catch (err) {
    console.error('Error in createEvent:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to create event.',
    });
  }
};

const updateEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const requesterId = req.user.userId;
    const requesterRole = req.user.role;
    const event = await eventService.updateEvent(eventId, requesterId, requesterRole, req.body);
    return res.status(200).json({
      success: true,
      message: 'Event updated successfully.',
      data: event,
    });
  } catch (err) {
    console.error('Error in updateEvent:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to update event.',
    });
  }
};

const cancelEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const requesterId = req.user.userId;
    const requesterRole = req.user.role;
    const event = await eventService.cancelEvent(eventId, requesterId, requesterRole);
    return res.status(200).json({
      success: true,
      message: 'Event cancelled successfully.',
      data: event,
    });
  } catch (err) {
    console.error('Error in cancelEvent:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to cancel event.',
    });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const requesterId = req.user.userId;
    const requesterRole = req.user.role;
    const result = await eventService.deleteEvent(eventId, requesterId, requesterRole);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    console.error('Error in deleteEvent:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to delete event.',
    });
  }
};

const getEvents = async (req, res) => {
  try {
    const currentUserId = req.user ? req.user.userId : null;
    const data = await eventService.getEvents(req.query, currentUserId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error('Error in getEvents:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to fetch events.',
    });
  }
};

const getEventDetails = async (req, res) => {
  try {
    const eventId = req.params.id;
    const currentUserId = req.user ? req.user.userId : null;
    const event = await eventService.getEventDetails(eventId, currentUserId);
    return res.status(200).json({
      success: true,
      data: event,
    });
  } catch (err) {
    console.error('Error in getEventDetails:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to fetch event details.',
    });
  }
};

const registerForEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.userId;
    const registration = await eventService.registerForEvent(eventId, userId);
    return res.status(201).json({
      success: true,
      message: 'Successfully registered for event.',
      data: registration,
    });
  } catch (err) {
    console.error('Error in registerForEvent:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to register for event.',
    });
  }
};

const cancelRegistration = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.userId;
    const registration = await eventService.cancelRegistration(eventId, userId);
    return res.status(200).json({
      success: true,
      message: 'Event registration cancelled.',
      data: registration,
    });
  } catch (err) {
    console.error('Error in cancelRegistration:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to cancel registration.',
    });
  }
};

const getUserRegistrations = async (req, res) => {
  try {
    const userId = req.user.userId;
    const registrations = await eventService.getUserRegistrations(userId);
    return res.status(200).json({
      success: true,
      data: registrations,
    });
  } catch (err) {
    console.error('Error in getUserRegistrations:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to fetch user registrations.',
    });
  }
};

const getEventRegistrants = async (req, res) => {
  try {
    const eventId = req.params.id;
    const requesterId = req.user.userId;
    const requesterRole = req.user.role;
    const registrants = await eventService.getEventRegistrants(eventId, requesterId, requesterRole);
    return res.status(200).json({
      success: true,
      data: registrants,
    });
  } catch (err) {
    console.error('Error in getEventRegistrants:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to fetch event registrants.',
    });
  }
};

const sendEventNotification = async (req, res) => {
  try {
    const eventId = req.params.id;
    const requesterId = req.user.userId;
    const requesterRole = req.user.role;
    const result = await eventService.sendEventNotification(eventId, requesterId, requesterRole, req.body);
    return res.status(200).json({
      success: true,
      message: `Notification sent to ${result.delivered} participant(s).`,
      data: result,
    });
  } catch (err) {
    console.error('Error in sendEventNotification:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to send notification.',
    });
  }
};

const sendEventReminders = async (req, res) => {
  try {
    const eventId = req.params.id;
    const { timeZone } = req.body || {};
    const result = await eventService.sendEventRemindersForEvent(eventId, { timeZone });
    return res.status(200).json({
      success: true,
      message: `Event reminder workflow completed: ${result.remindersSent} notification(s) created, ${result.smsDispatched} SMS dispatched (${result.skippedAlreadyNotified} already notified).`,
      data: result,
    });
  } catch (err) {
    console.error('Error in sendEventReminders:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to dispatch event reminders.',
    });
  }
};

const getInvitableStudents = async (req, res) => {
  try {
    const eventId = req.params.id;
    const students = await eventService.getInvitableStudents(eventId);
    return res.status(200).json({
      success: true,
      data: students,
    });
  } catch (err) {
    console.error('Error in getInvitableStudents:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to fetch students.',
    });
  }
};

const getEventCommunity = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user ? req.user.userId : null;
    const userRole = req.user ? req.user.role : null;
    const data = await eventService.getEventCommunity(eventId, userId, userRole);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error('Error in getEventCommunity:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to fetch event community.',
    });
  }
};

const createCommunityPost = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const post = await eventService.createCommunityPost(eventId, userId, userRole, req.body);
    return res.status(201).json({
      success: true,
      message: 'Post created successfully.',
      data: post,
    });
  } catch (err) {
    console.error('Error in createCommunityPost:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to create post.',
    });
  }
};

const updateMeetingLink = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { meetingUrl } = req.body;
    const updated = await eventService.updateMeetingLink(eventId, userId, userRole, meetingUrl);
    return res.status(200).json({
      success: true,
      message: 'Webinar link updated successfully.',
      data: updated,
    });
  } catch (err) {
    console.error('Error in updateMeetingLink:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to update meeting link.',
    });
  }
};

const deleteCommunityPost = async (req, res) => {
  try {
    const eventId = req.params.id;
    const postId = req.params.postId;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const result = await eventService.deleteCommunityPost(eventId, postId, userId, userRole);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    console.error('Error in deleteCommunityPost:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to delete post.',
    });
  }
};

const saveEventRecording = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const recording = await eventService.saveEventRecording(eventId, userId, userRole, req.body);
    return res.status(200).json({
      success: true,
      message: 'Webinar recording & AI knowledge extraction saved successfully.',
      data: recording,
    });
  } catch (err) {
    console.error('Error in saveEventRecording:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to save recording.',
    });
  }
};

const getEventRecording = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const recording = await eventService.getEventRecording(eventId, userId, userRole);
    return res.status(200).json({
      success: true,
      data: recording,
    });
  } catch (err) {
    console.error('Error in getEventRecording:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to fetch recording.',
    });
  }
};

const queryEventRecordingRag = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { question } = req.body;
    const result = await eventService.queryEventRecordingRag(eventId, userId, userRole, question);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('Error in queryEventRecordingRag:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to query AI knowledge base.',
    });
  }
};

const deleteEventRecording = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const result = await eventService.deleteEventRecording(eventId, userId, userRole);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    console.error('Error in deleteEventRecording:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to delete recording.',
    });
  }
};

module.exports = {
  createEvent,
  updateEvent,
  cancelEvent,
  deleteEvent,
  getEvents,
  getEventDetails,
  registerForEvent,
  cancelRegistration,
  getUserRegistrations,
  getEventRegistrants,
  getInvitableStudents,
  sendEventNotification,
  sendEventReminders,
  // Community and Recording:
  getEventCommunity,
  createCommunityPost,
  updateMeetingLink,
  deleteCommunityPost,
  saveEventRecording,
  getEventRecording,
  queryEventRecordingRag,
  deleteEventRecording,
};

