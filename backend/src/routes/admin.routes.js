const express = require('express');
const adminController = require('../controllers/admin.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');

const router = express.Router();

// All admin routes require valid JWT token and ADMIN role
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN'));

// ── User management ────────────────────────────────────────────────────
router.get('/users/pending', adminController.getPendingUsers);
router.patch('/users/:id/approve', adminController.approveUser);
router.patch('/users/:id/reject', adminController.rejectUser);

// ── Dashboard analytics ────────────────────────────────────────────────
router.get('/dashboard/summary', adminController.getDashboardSummary);
router.get('/dashboard/kpi', adminController.getKpiStats);
router.get('/dashboard/activity', adminController.getRecentActivity);
router.get('/dashboard/events/upcoming', adminController.getUpcomingEvents);
router.get('/dashboard/companies/top', adminController.getTopCompanies);

module.exports = router;
