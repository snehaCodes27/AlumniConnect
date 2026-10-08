import api from './api';

export const alumniProfileService = {
  async getProfile() {
    const response = await api.get('/alumni/profile');
    return response.data;
  },

  async completeOnboarding(formData) {
    const response = await api.post('/alumni/profile/onboarding', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async updateProfile(data) {
    const response = await api.put('/alumni/profile', data);
    return response.data;
  },

  async uploadPhoto(file) {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await api.post('/alumni/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async uploadResume(file) {
    const formData = new FormData();
    formData.append('resume', file);
    const response = await api.post('/alumni/profile/resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export default alumniProfileService;
