const jobService = require('../services/job.service');
const {
  validateCreateJob,
  validateUpdateJob,
  validateApplyJob,
  validateUpdateApplicationStatus,
} = require('../validators/job.validator');

/**
 * POST /api/jobs - Alumni creates job opening
 */
const createJob = async (req, res, next) => {
  try {
    const alumniId = req.user.userId;
    const { isValid, errors } = validateCreateJob(req.body);
    if (!isValid) {
      const err = new Error(errors.join(' '));
      err.statusCode = 400;
      throw err;
    }

    const job = await jobService.createJob(alumniId, req.body);
    return res.status(201).json({
      success: true,
      message: 'Job opening posted successfully.',
      data: job,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/jobs/:id - Alumni updates job opening
 */
const updateJob = async (req, res, next) => {
  try {
    const alumniId = req.user.userId;
    const { id } = req.params;
    const { isValid, errors } = validateUpdateJob(req.body);
    if (!isValid) {
      const err = new Error(errors.join(' '));
      err.statusCode = 400;
      throw err;
    }

    const updated = await jobService.updateJob(alumniId, id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Job opening updated successfully.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/jobs/:id/close - Alumni closes job opening
 */
const closeJob = async (req, res, next) => {
  try {
    const alumniId = req.user.userId;
    const { id } = req.params;

    const closed = await jobService.closeJob(alumniId, id);
    return res.status(200).json({
      success: true,
      message: 'Job opening closed successfully.',
      data: closed,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/jobs/:id - Alumni deletes job opening
 */
const deleteJob = async (req, res, next) => {
  try {
    const alumniId = req.user.userId;
    const { id } = req.params;

    const result = await jobService.deleteJob(alumniId, id);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/jobs/posted/my - Alumni views their posted job openings with analytics
 */
const getAlumniJobs = async (req, res, next) => {
  try {
    const alumniId = req.user.userId;
    const { status, page, limit } = req.query;

    const data = await jobService.getAlumniJobs(alumniId, { status, page, limit });
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/jobs/:id/applicants - Alumni views applicants for a specific job
 */
const getJobApplicants = async (req, res, next) => {
  try {
    const alumniId = req.user.userId;
    const { id } = req.params;
    const { status, page, limit } = req.query;

    const data = await jobService.getJobApplicants(alumniId, id, { status, page, limit });
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/jobs/applications/:applicationId/status - Alumni updates applicant status
 */
const updateApplicationStatus = async (req, res, next) => {
  try {
    const alumniId = req.user.userId;
    const { applicationId } = req.params;
    const { isValid, errors } = validateUpdateApplicationStatus(req.body);
    if (!isValid) {
      const err = new Error(errors.join(' '));
      err.statusCode = 400;
      throw err;
    }

    const updated = await jobService.updateApplicationStatus(alumniId, applicationId, req.body);
    return res.status(200).json({
      success: true,
      message: `Application status updated to ${req.body.status}.`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/jobs - Public/Student browse active job openings
 */
const getActiveJobs = async (req, res, next) => {
  try {
    const studentUserId = req.user?.userId || null;
    const { q, company, employmentType, workplaceType, location, skills, branch, page, limit } = req.query;

    const data = await jobService.getActiveJobs(
      { q, company, employmentType, workplaceType, location, skills, branch, page, limit },
      studentUserId
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/jobs/:id - Get single job details
 */
const getJobDetails = async (req, res, next) => {
  try {
    const studentUserId = req.user?.userId || null;
    const { id } = req.params;

    const job = await jobService.getJobDetails(id, studentUserId);
    return res.status(200).json({
      success: true,
      data: job,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/jobs/:id/apply - Student applies for a job opening
 */
const applyForJob = async (req, res, next) => {
  try {
    const studentUserId = req.user.userId;
    const { id } = req.params;

    const { isValid, errors } = validateApplyJob(req.body);
    if (!isValid) {
      const err = new Error(errors.join(' '));
      err.statusCode = 400;
      throw err;
    }

    const application = await jobService.applyForJob(studentUserId, id, req.body);
    return res.status(201).json({
      success: true,
      message: 'Job application submitted successfully.',
      data: application,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/jobs/applications/my - Student views all their applications
 */
const getStudentApplications = async (req, res, next) => {
  try {
    const studentUserId = req.user.userId;
    const { status, page, limit } = req.query;

    const data = await jobService.getStudentApplications(studentUserId, { status, page, limit });
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/jobs/applications/:applicationId/withdraw - Student withdraws application
 */
const withdrawApplication = async (req, res, next) => {
  try {
    const studentUserId = req.user.userId;
    const { applicationId } = req.params;

    const updated = await jobService.withdrawApplication(studentUserId, applicationId);
    return res.status(200).json({
      success: true,
      message: 'Job application withdrawn.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createJob,
  updateJob,
  closeJob,
  deleteJob,
  getAlumniJobs,
  getJobApplicants,
  updateApplicationStatus,
  getActiveJobs,
  getJobDetails,
  applyForJob,
  getStudentApplications,
  withdrawApplication,
};
