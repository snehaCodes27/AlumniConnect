const connectionService = require('../services/connection.service');

/**
 * POST /api/connections/request
 * Send a connection request
 */
const sendRequest = async (req, res, next) => {
  try {
    const senderId = req.user.userId;
    const { receiverId, message } = req.body;

    const connection = await connectionService.sendConnectionRequest({
      senderId,
      receiverId,
      message,
    });

    return res.status(201).json({
      success: true,
      message: 'Connection request sent successfully.',
      data: connection,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/connections/:id/respond
 * Accept or Reject incoming connection request
 */
const respondRequest = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { status } = req.body; // 'ACCEPTED' | 'REJECTED'

    const connection = await connectionService.respondToConnectionRequest({
      userId,
      connectionId: id,
      status,
    });

    return res.status(200).json({
      success: true,
      message: `Connection request ${status === 'ACCEPTED' ? 'accepted' : 'rejected'}.`,
      data: connection,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/connections/:id/withdraw
 * Withdraw sent connection request
 */
const withdrawRequest = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const connection = await connectionService.withdrawConnectionRequest({
      userId,
      connectionId: id,
    });

    return res.status(200).json({
      success: true,
      message: 'Connection request withdrawn.',
      data: connection,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/connections/received
 * Get received connection requests
 */
const getReceivedRequests = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { status, page, limit } = req.query;

    const result = await connectionService.getReceivedRequests(userId, { status, page, limit });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/connections/sent
 * Get sent connection requests
 */
const getSentRequests = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { status, page, limit } = req.query;

    const result = await connectionService.getSentRequests(userId, { status, page, limit });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/connections
 * Get user's accepted connections
 */
const getMyConnections = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { page, limit, search } = req.query;

    const result = await connectionService.getMyConnections(userId, { page, limit, search });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/connections/statuses
 * Batch lookup of connection statuses for multiple user IDs
 */
const getStatusesMap = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { userIds } = req.body;

    const map = await connectionService.getConnectionStatusesMap(userId, userIds);

    return res.status(200).json({
      success: true,
      data: map,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendRequest,
  respondRequest,
  withdrawRequest,
  getReceivedRequests,
  getSentRequests,
  getMyConnections,
  getStatusesMap,
};
