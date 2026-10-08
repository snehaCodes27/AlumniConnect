import api from './api';

/**
 * Job & Job Application API Service
 */
export const jobService = {
  /**
   * GET /api/jobs
   * Browse active job openings with relevance matching score for student
   */
  async getActiveJobs(params = {}) {
    const response = await api.get('/jobs', { params });
    return response.data;
  },

  /**
   * GET /api/jobs/:id
   * Get full details for a single job opening
   */
  async getJobDetails(id) {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  },

  /**
   * POST /api/jobs/:id/apply
   * Student applies for a job opening with resume, cover letter, and links
   */
  async applyForJob(id, data) {
    const response = await api.post(`/jobs/${id}/apply`, data);
    return response.data;
  },

  /**
   * GET /api/jobs/applications/my
   * Student views all submitted job applications
   */
  async getStudentApplications(params = {}) {
    const response = await api.get('/jobs/applications/my', { params });
    return response.data;
  },

  /**
   * DELETE /api/jobs/applications/:applicationId/withdraw
   * Student withdraws a pending application
   */
  async withdrawApplication(applicationId) {
    const response = await api.delete(`/jobs/applications/${applicationId}/withdraw`);
    return response.data;
  },

  /**
   * GET /api/jobs/posted/my
   * Alumni views all posted job openings with applicant count analytics
   */
  async getAlumniJobs(params = {}) {
    const response = await api.get('/jobs/posted/my', { params });
    return response.data;
  },

  /**
   * POST /api/jobs
   * Alumni creates a new job opening
   */
  async createJob(data) {
    const response = await api.post('/jobs', data);
    return response.data;
  },

  /**
   * PUT /api/jobs/:id
   * Alumni updates an existing job opening
   */
  async updateJob(id, data) {
    const response = await api.put(`/jobs/${id}`, data);
    return response.data;
  },

  /**
   * PATCH /api/jobs/:id/close
   * Alumni closes a job opening
   */
  async closeJob(id) {
    const response = await api.patch(`/jobs/${id}/close`);
    return response.data;
  },

  /**
   * DELETE /api/jobs/:id
   * Alumni deletes a job opening
   */
  async deleteJob(id) {
    const response = await api.delete(`/jobs/${id}`);
    return response.data;
  },

  /**
   * GET /api/jobs/:id/applicants
   * Alumni views applicants for a specific job with match scores
   */
  async getJobApplicants(jobId, params = {}) {
    const response = await api.get(`/jobs/${jobId}/applicants`, { params });
    return response.data;
  },

  /**
   * PATCH /api/jobs/applications/:applicationId/status
   * Alumni updates student application status (SHORTLISTED, INTERVIEW, SELECTED, REJECTED)
   */
  async updateApplicationStatus(applicationId, data) {
    const response = await api.patch(`/jobs/applications/${applicationId}/status`, data);
    return response.data;
  },
};

export default jobService;
