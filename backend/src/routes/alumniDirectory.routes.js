const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');
const { getAlumniDirectory, syncEmbeddings } = require('../controllers/alumniDirectory.controller');

const router = express.Router();

// Allow all authenticated platform users (students, alumni, and admins) to view the directory
router.use(authenticateToken);
router.use(authorizeRoles('STUDENT', 'ALUMNI', 'ADMIN'));

// GET /api/alumni/directory?q=&currentCompany=&skills=&...
router.get('/', getAlumniDirectory);

// POST /api/alumni/directory/sync-embeddings
router.post('/sync-embeddings', syncEmbeddings);

module.exports = router;
