const express = require('express');
const { authenticateToken, authorizeRoles, optionalAuthenticateToken } = require('../middleware/auth.middleware');
const jobController = require('../controllers/job.controller');

const router = express.Router();

// ── Public / Optional Auth Routes ──────────────────────────────────────────────
// Browse active job postings (attaches application status if authenticated student)
router.get('/', optionalAuthenticateToken, jobController.getActiveJobs);

// Get single job details
router.get('/:id', optionalAuthenticateToken, jobController.getJobDetails);

// ── Authenticated Routes ───────────────────────────────────────────────────────
router.use(authenticateToken);

// Student Routes
router.get('/applications/my', authorizeRoles('STUDENT', 'ADMIN'), jobController.getStudentApplications);
router.post('/:id/apply', authorizeRoles('STUDENT', 'ADMIN'), jobController.applyForJob);
router.delete('/applications/:applicationId/withdraw', authorizeRoles('STUDENT', 'ADMIN'), jobController.withdrawApplication);

// Alumni & Admin Routes
router.get('/posted/my', authorizeRoles('ALUMNI', 'ADMIN'), jobController.getAlumniJobs);
router.post('/', authorizeRoles('ALUMNI', 'ADMIN'), jobController.createJob);
router.put('/:id', authorizeRoles('ALUMNI', 'ADMIN'), jobController.updateJob);
router.patch('/:id/close', authorizeRoles('ALUMNI', 'ADMIN'), jobController.closeJob);
router.delete('/:id', authorizeRoles('ALUMNI', 'ADMIN'), jobController.deleteJob);

router.get('/:id/applicants', authorizeRoles('ALUMNI', 'ADMIN'), jobController.getJobApplicants);
router.patch('/applications/:applicationId/status', authorizeRoles('ALUMNI', 'ADMIN'), jobController.updateApplicationStatus);

module.exports = router;
