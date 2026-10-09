const express = require('express');
const {
  authenticateToken,
  authorizeRoles
} = require('../middleware/auth.middleware');
const controller = require('../controllers/companyConnect.controller');
const router = express.Router();
router.head('/email-respond', controller.emailRespond);
router.get('/email-respond', controller.emailRespond);
router.use(authenticateToken);
router.get('/drives', controller.getDrives);
router.get('/drives/:id', controller.getDrive);
router.post('/drives', authorizeRoles('ADMIN'), controller.createDrive);
router.patch('/drives/:id/close', authorizeRoles('ADMIN'), controller.closeDrive);
router.post('/search-alumni', authorizeRoles('ADMIN'), controller.searchAlumni);
router.post('/send-invites', authorizeRoles('ADMIN'), controller.sendInvites);
router.post('/retry-invite-emails', authorizeRoles('ADMIN'), controller.retryInvites);
router.post('/broadcast-students', authorizeRoles('ADMIN'), controller.broadcastStudents);
router.post('/respond', authorizeRoles('ALUMNI'), controller.respond);
router.post('/register', authorizeRoles('STUDENT'), controller.register);
router.post(['/reset', '/search-invite'], authorizeRoles('ADMIN'), controller.retired);
module.exports = router;
