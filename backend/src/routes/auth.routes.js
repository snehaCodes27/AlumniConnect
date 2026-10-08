const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Public auth routes
router.post('/register/student', authController.registerStudent);
router.post('/register/alumni', authController.registerAlumni);
router.post('/login', authController.login);

// Protected auth routes
router.get('/me', authenticateToken, authController.getCurrentUser);
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
