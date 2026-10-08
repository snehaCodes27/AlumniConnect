import api from './api';

export const eventService = {
  // Get list of events with filters
  getEvents: async (params = {}) => {
    const response = await api.get('/events', { params });
    return response.data;
  },

  // Get event details by ID
  getEventDetails: async (id) => {
    const response = await api.get(`/events/${id}`);
    return response.data;
  },

  // Create new event (Alumni / Admin)
  createEvent: async (payload) => {
    const response = await api.post('/events', payload);
    return response.data;
  },

  // Update event (Alumni / Admin)
  updateEvent: async (id, payload) => {
    const response = await api.put(`/events/${id}`, payload);
    return response.data;
  },

  // Cancel event (Alumni / Admin)
  cancelEvent: async (id) => {
    const response = await api.patch(`/events/${id}/cancel`);
    return response.data;
  },

  // Delete event (Alumni / Admin)
  deleteEvent: async (id) => {
    const response = await api.delete(`/events/${id}`);
    return response.data;
  },

  // Register for event (Student / User)
  registerForEvent: async (id) => {
    const response = await api.post(`/events/${id}/register`);
    return response.data;
  },

  // Cancel registration (Student / User)
  cancelRegistration: async (id) => {
    const response = await api.delete(`/events/${id}/register`);
    return response.data;
  },

  // Get user's registered events
  getUserRegistrations: async () => {
    const response = await api.get('/events/registrations/my');
    return response.data;
  },

  // Get event registrants (Alumni / Admin)
  getEventRegistrants: async (id) => {
    const response = await api.get(`/events/${id}/registrants`);
    return response.data;
  },

  // Get invitable students (Alumni / Admin)
  getInvitableStudents: async (id) => {
    const response = await api.get(`/events/${id}/invitable-students`);
    return response.data;
  },

  // Send broadcast notification to all registered participants (Alumni / Admin)
  sendEventNotification: async (id, { title, message }) => {
    const response = await api.post(`/events/${id}/notify`, { title, message });
    return response.data;
  },

  // ── Automatic Private Event Community ──────────────────────────────────────
  getEventCommunity: async (id) => {
    const response = await api.get(`/events/${id}/community`);
    return response.data;
  },

  createCommunityPost: async (id, payload) => {
    const response = await api.post(`/events/${id}/community/posts`, payload);
    return response.data;
  },

  updateMeetingLink: async (id, meetingUrl) => {
    const response = await api.put(`/events/${id}/community/meeting-link`, { meetingUrl });
    return response.data;
  },

  deleteCommunityPost: async (id, postId) => {
    const response = await api.delete(`/events/${id}/community/posts/${postId}`);
    return response.data;
  },

  // ── Webinar Recording, Transcript, AI Extraction & RAG ─────────────────────
  getEventRecording: async (id) => {
    const response = await api.get(`/events/${id}/recording`);
    return response.data;
  },

  saveEventRecording: async (id, payload) => {
    const response = await api.post(`/events/${id}/recording`, payload);
    return response.data;
  },

  queryEventRecordingRag: async (id, question) => {
    const response = await api.post(`/events/${id}/recording/ask-ai`, { question });
    return response.data;
  },

  deleteEventRecording: async (id) => {
    const response = await api.delete(`/events/${id}/recording`);
    return response.data;
  },
};

