import api from './api';

export const studentProfileService = {
  async getProfile() {
    const response = await api.get('/student/profile');
    return response.data;
  },

  async updateProfile(data) {
    const response = await api.put('/student/profile', data);
    return response.data;
  },

  async uploadPhoto(file) {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await api.post('/student/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async uploadResume(file) {
    const formData = new FormData();
    formData.append('resume', file);
    const response = await api.post('/student/profile/resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export default studentProfileService;