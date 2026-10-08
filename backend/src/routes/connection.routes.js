const express = require('express');
const { authenticateToken } = require('../middleware/auth.middleware');
const {
  sendRequest,
  respondRequest,
  withdrawRequest,
  getReceivedRequests,
  getSentRequests,
  getMyConnections,
  getStatusesMap,
} = require('../controllers/connection.controller');

const router = express.Router();

router.use(authenticateToken);

router.post('/request', sendRequest);
router.patch('/:id/respond', respondRequest);
router.delete('/:id/withdraw', withdrawRequest);
router.get('/received', getReceivedRequests);
router.get('/sent', getSentRequests);
router.get('/', getMyConnections);
router.post('/statuses', getStatusesMap);

module.exports = router;
