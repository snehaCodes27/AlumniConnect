const prisma = require('../config/prisma');
const notificationService = require('./notification.service');
const { emitToUser } = require('../socket');

const USER_SELECT_FIELDS = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  profilePhoto: true,
  role: true,
  studentProfile: {
    select: {
      id: true,
      branch: true,
      graduationYear: true,
      currentYear: true,
      preferredDomain: true,
      skills: true,
    },
  },
  alumniProfile: {
    select: {
      id: true,
      branch: true,
      graduationYear: true,
      currentCompany: true,
      jobRole: true,
      domain: true,
      skills: true,
      mentorshipAvailable: true,
    },
  },
};

/**
 * Send a new connection request or re-open a previously withdrawn/rejected request
 */
const sendConnectionRequest = async ({ senderId, receiverId, message = '' }) => {
  if (!receiverId) {
    const error = new Error('Receiver ID is required.');
    error.statusCode = 400;
    throw error;
  }

  if (senderId === receiverId) {
    const error = new Error('You cannot send a connection request to yourself.');
    error.statusCode = 400;
    throw error;
  }

  // Verify receiver exists
  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    select: { id: true, firstName: true, lastName: true, role: true },
  });

  if (!receiver) {
    const error = new Error('User to connect with was not found.');
    error.statusCode = 404;
    throw error;
  }

  // Check if connection already exists in either direction
  const existing = await prisma.connection.findFirst({
    where: {
      OR: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    },
  });

  if (existing) {
    if (existing.status === 'ACCEPTED') {
      const error = new Error('You are already connected with this user.');
      error.statusCode = 400;
      throw error;
    }

    if (existing.status === 'PENDING') {
      if (existing.senderId === senderId) {
        const error = new Error('A connection request is already pending with this user.');
        error.statusCode = 400;
        throw error;
      } else {
        const error = new Error(
          'This user has already sent you a connection request. Please check your incoming requests to accept.'
        );
        error.statusCode = 400;
        throw error;
      }
    }
  }

  // Create or update connection
  let connection;
  if (existing) {
    connection = await prisma.connection.update({
      where: { id: existing.id },
      data: {
        senderId,
        receiverId,
        message: message?.trim() || null,
        status: 'PENDING',
        updatedAt: new Date(),
      },
      include: {
        sender: { select: USER_SELECT_FIELDS },
        receiver: { select: USER_SELECT_FIELDS },
      },
    });
  } else {
    connection = await prisma.connection.create({
      data: {
        senderId,
        receiverId,
        message: message?.trim() || null,
        status: 'PENDING',
      },
      include: {
        sender: { select: USER_SELECT_FIELDS },
        receiver: { select: USER_SELECT_FIELDS },
      },
    });
  }

  // Create persistent PostgreSQL notification for the receiver
  await notificationService.createNotification({
    userId: receiverId,
    actorId: senderId,
    type: 'CONNECTION_REQUEST',
    title: 'New Connection Request',
    message: `${connection.sender.firstName} ${connection.sender.lastName} sent you a connection request.`,
    data: {
      connectionId: connection.id,
      senderId,
      senderRole: connection.sender.role,
      message: connection.message,
    },
  });

  // Emit real-time Socket.IO events to both parties
  emitToUser(receiverId, 'connection:request:received', connection);
  emitToUser(senderId, 'connection:request:sent', connection);

  return connection;
};

/**
 * Accept or Reject an incoming connection request
 */
const respondToConnectionRequest = async ({ userId, connectionId, status }) => {
  if (!['ACCEPTED', 'REJECTED'].includes(status)) {
    const error = new Error("Invalid status. Allowed values are 'ACCEPTED' or 'REJECTED'.");
    error.statusCode = 400;
    throw error;
  }

  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    include: {
      sender: { select: USER_SELECT_FIELDS },
      receiver: { select: USER_SELECT_FIELDS },
    },
  });

  if (!connection) {
    const error = new Error('Connection request not found.');
    error.statusCode = 404;
    throw error;
  }

  if (connection.receiverId !== userId) {
    const error = new Error('You are not authorized to respond to this connection request.');
    error.statusCode = 403;
    throw error;
  }

  if (connection.status !== 'PENDING') {
    const error = new Error(`Connection request is already ${connection.status.toLowerCase()}.`);
    error.statusCode = 400;
    throw error;
  }

  const updatedConnection = await prisma.connection.update({
    where: { id: connectionId },
    data: { status },
    include: {
      sender: { select: USER_SELECT_FIELDS },
      receiver: { select: USER_SELECT_FIELDS },
    },
  });

  // Create persistent notification for sender
  await notificationService.createNotification({
    userId: connection.senderId,
    actorId: userId,
    type: status === 'ACCEPTED' ? 'CONNECTION_ACCEPTED' : 'CONNECTION_REJECTED',
    title: status === 'ACCEPTED' ? 'Connection Request Accepted' : 'Connection Request Declined',
    message: `${connection.receiver.firstName} ${connection.receiver.lastName} ${
      status === 'ACCEPTED' ? 'accepted' : 'declined'
    } your connection request.`,
    data: {
      connectionId: updatedConnection.id,
      receiverId: userId,
      status,
    },
  });

  // Emit real-time Socket.IO events
  emitToUser(connection.senderId, 'connection:updated', updatedConnection);
  emitToUser(userId, 'connection:updated', updatedConnection);

  // Automatically award gamification points to alumni for accepting student connection
  if (status === 'ACCEPTED') {
    try {
      const acceptingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (acceptingUser && acceptingUser.role === 'ALUMNI') {
        const gamificationService = require('./gamification.service');
        await gamificationService.awardPoints({
          userId,
          activityType: 'CONNECTION_ACCEPTED',
          referenceId: updatedConnection.id,
          referenceType: 'connection',
          description: `Connected with student ${connection.sender.firstName} ${connection.sender.lastName}`,
        });
      }
    } catch (gErr) {
      console.warn('[Gamification] Connection accept points award error:', gErr.message);
    }
  }

  return updatedConnection;
};

/**
 * Withdraw a pending sent connection request
 */
const withdrawConnectionRequest = async ({ userId, connectionId }) => {
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    const error = new Error('Connection request not found.');
    error.statusCode = 404;
    throw error;
  }

  if (connection.senderId !== userId) {
    const error = new Error('You are not authorized to withdraw this connection request.');
    error.statusCode = 403;
    throw error;
  }

  if (connection.status !== 'PENDING') {
    const error = new Error(`Cannot withdraw a connection request that is already ${connection.status.toLowerCase()}.`);
    error.statusCode = 400;
    throw error;
  }

  const updated = await prisma.connection.update({
    where: { id: connectionId },
    data: { status: 'WITHDRAWN' },
  });

  emitToUser(connection.receiverId, 'connection:withdrawn', { connectionId });
  emitToUser(userId, 'connection:withdrawn', { connectionId });

  return updated;
};

/**
 * Get incoming received connection requests for a user
 */
const getReceivedRequests = async (userId, { status = 'PENDING', page = 1, limit = 20 } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  const where = { receiverId: userId };
  if (status) {
    where.status = status;
  }

  const [total, requests] = await Promise.all([
    prisma.connection.count({ where }),
    prisma.connection.findMany({
      where,
      include: {
        sender: { select: USER_SELECT_FIELDS },
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
  ]);

  return {
    requests,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Get outgoing sent connection requests by a user
 */
const getSentRequests = async (userId, { status, page = 1, limit = 20 } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  const where = { senderId: userId };
  if (status) {
    where.status = status;
  }

  const [total, requests] = await Promise.all([
    prisma.connection.count({ where }),
    prisma.connection.findMany({
      where,
      include: {
        receiver: { select: USER_SELECT_FIELDS },
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
  ]);

  return {
    requests,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Get all accepted connections for a user
 */
const getMyConnections = async (userId, { page = 1, limit = 20, search = '' } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  const where = {
    status: 'ACCEPTED',
    OR: [{ senderId: userId }, { receiverId: userId }],
  };

  const connections = await prisma.connection.findMany({
    where,
    include: {
      sender: { select: USER_SELECT_FIELDS },
      receiver: { select: USER_SELECT_FIELDS },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Map to format with `connectedUser`
  let list = connections.map((conn) => {
    const isSender = conn.senderId === userId;
    const connectedUser = isSender ? conn.receiver : conn.sender;
    return {
      id: conn.id,
      connectionId: conn.id,
      connectedAt: conn.updatedAt,
      connectedUser,
    };
  });

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter((item) => {
      const u = item.connectedUser;
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
      const company = (u.alumniProfile?.currentCompany || '').toLowerCase();
      const role = (u.alumniProfile?.jobRole || '').toLowerCase();
      const branch = (u.studentProfile?.branch || u.alumniProfile?.branch || '').toLowerCase();
      return fullName.includes(q) || company.includes(q) || role.includes(q) || branch.includes(q);
    });
  }

  const total = list.length;
  const paginated = list.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  return {
    connections: paginated,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Batch lookup of connection statuses between current user and target user IDs
 */
const getConnectionStatusesMap = async (currentUserId, targetUserIds = []) => {
  if (!currentUserId || !targetUserIds || targetUserIds.length === 0) {
    return {};
  }

  const connections = await prisma.connection.findMany({
    where: {
      OR: [
        { senderId: currentUserId, receiverId: { in: targetUserIds } },
        { receiverId: currentUserId, senderId: { in: targetUserIds } },
      ],
    },
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      status: true,
      createdAt: true,
    },
  });

  const map = {};
  for (const conn of connections) {
    const targetId = conn.senderId === currentUserId ? conn.receiverId : conn.senderId;
    const isSender = conn.senderId === currentUserId;
    map[targetId] = {
      connectionId: conn.id,
      status: conn.status,
      isSender,
      createdAt: conn.createdAt,
    };
  }

  return map;
};

module.exports = {
  sendConnectionRequest,
  respondToConnectionRequest,
  withdrawConnectionRequest,
  getReceivedRequests,
  getSentRequests,
  getMyConnections,
  getConnectionStatusesMap,
};
