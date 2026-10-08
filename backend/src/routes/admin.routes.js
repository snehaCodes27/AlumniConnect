const express = require('express');
const adminController = require('../controllers/admin.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');

const router = express.Router();

// All admin routes require valid JWT token and ADMIN role
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN'));

router.get('/users/pending', adminController.getPendingUsers);
router.patch('/users/:id/approve', adminController.approveUser);
router.patch('/users/:id/reject', adminController.rejectUser);

module.exports = router;
