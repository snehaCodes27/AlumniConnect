const prisma = require('../config/prisma');
const { emitToUser, getIO, isUserOnline } = require('../socket');

/**
 * Helper to get normalized participant IDs in canonical order
 * Strictly enforces user1Id < user2Id to guarantee zero duplicate conversations
 */
function getCanonicalPair(userAId, userBId) {
  if (userAId === userBId) {
    throw new Error('Cannot create a conversation with yourself.');
  }
  return userAId < userBId
    ? { user1Id: userAId, user2Id: userBId }
    : { user1Id: userBId, user2Id: userAId };
}

/**
 * Check if two users are authorized to chat:
 * Must have an ACCEPTED Connection OR an ACCEPTED MentorshipRequest
 */
async function checkCanMessage(userAId, userBId) {
  if (userAId === userBId) {
    return { allowed: false, reason: 'You cannot message yourself.' };
  }

  // 1. Check for ACCEPTED connection
  const connection = await prisma.connection.findFirst({
    where: {
      OR: [
        { senderId: userAId, receiverId: userBId, status: 'ACCEPTED' },
        { senderId: userBId, receiverId: userAId, status: 'ACCEPTED' },
      ],
    },
  });

  if (connection) {
    return { allowed: true, connectionType: 'CONNECTION', record: connection };
  }

  // 2. Check for ACCEPTED mentorship request
  const mentorship = await prisma.mentorshipRequest.findFirst({
    where: {
      OR: [
        { studentId: userAId, alumniId: userBId, status: 'ACCEPTED' },
        { studentId: userBId, alumniId: userAId, status: 'ACCEPTED' },
      ],
    },
  });

  if (mentorship) {
    return { allowed: true, connectionType: 'MENTORSHIP', record: mentorship };
  }

  return {
    allowed: false,
    reason: 'Only connected or active mentorship partners can message each other. Send a connection or mentorship request first.',
  };
}

/**
 * Get or create a conversation between two authorized users
 * Prevents unauthorized conversations and duplicate conversation records
 */
async function getOrCreateConversation(currentUserId, otherUserId) {
  // Authorization check
  const authCheck = await checkCanMessage(currentUserId, otherUserId);
  if (!authCheck.allowed) {
    const err = new Error(authCheck.reason);
    err.status = 403;
    throw err;
  }

  const { user1Id, user2Id } = getCanonicalPair(currentUserId, otherUserId);

  const conversation = await prisma.conversation.upsert({
    where: {
      user1Id_user2Id: { user1Id, user2Id },
    },
    create: {
      user1Id,
      user2Id,
    },
    update: {},
    include: {
      user1: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePhoto: true,
          role: true,
          alumniProfile: { select: { currentCompany: true, jobRole: true } },
          studentProfile: { select: { branch: true, graduationYear: true } },
        },
      },
      user2: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePhoto: true,
          role: true,
          alumniProfile: { select: { currentCompany: true, jobRole: true } },
          studentProfile: { select: { branch: true, graduationYear: true } },
        },
      },
    },
  });

  const otherUser = conversation.user1Id === currentUserId ? conversation.user2 : conversation.user1;

  return {
    ...conversation,
    otherUser: {
      ...otherUser,
      isOnline: isUserOnline(otherUser.id),
    },
  };
}

/**
 * Get all conversations for a user with unread counts and partner profiles
 */
async function getUserConversations(userId) {
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    include: {
      user1: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePhoto: true,
          role: true,
          alumniProfile: { select: { currentCompany: true, jobRole: true } },
          studentProfile: { select: { branch: true, graduationYear: true } },
        },
      },
      user2: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePhoto: true,
          role: true,
          alumniProfile: { select: { currentCompany: true, jobRole: true } },
          studentProfile: { select: { branch: true, graduationYear: true } },
        },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: [
      { lastMessageAt: 'desc' },
      { updatedAt: 'desc' },
    ],
  });

  // Calculate unread count for each conversation
  const enhanced = await Promise.all(
    conversations.map(async (conv) => {
      const otherUser = conv.user1Id === userId ? conv.user2 : conv.user1;
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: userId },
          isRead: false,
        },
      });

      return {
        id: conv.id,
        user1Id: conv.user1Id,
        user2Id: conv.user2Id,
        lastMessageText: conv.lastMessageText || conv.messages[0]?.content || null,
        lastMessageAt: conv.lastMessageAt || conv.messages[0]?.createdAt || conv.updatedAt,
        unreadCount,
        otherUser: {
          ...otherUser,
          isOnline: isUserOnline(otherUser.id),
        },
      };
    })
  );

  return enhanced;
}

/**
 * Get message history for a conversation and mark incoming messages as read
 */
async function getConversationMessages(conversationId, currentUserId, { page = 1, limit = 50 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    const err = new Error('Conversation not found');
    err.status = 404;
    throw err;
  }

  // Verify participant
  if (conversation.user1Id !== currentUserId && conversation.user2Id !== currentUserId) {
    const err = new Error('You are not a participant in this conversation.');
    err.status = 403;
    throw err;
  }

  const otherUserId = conversation.user1Id === currentUserId ? conversation.user2Id : conversation.user1Id;

  // Mark all unread messages from the other user as read
  const unreadCount = await prisma.message.count({
    where: {
      conversationId,
      senderId: otherUserId,
      isRead: false,
    },
  });

  if (unreadCount > 0) {
    const readAt = new Date();
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: otherUserId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt,
      },
    });

    // Notify other user in real-time that messages were read
    const io = getIO();
    if (io) {
      io.to(`conversation:${conversationId}`).emit('chat:read_receipt', {
        conversationId,
        readBy: currentUserId,
        readAt,
      });
      emitToUser(otherUserId, 'chat:unread_updated', {
        conversationId,
        unreadCount: 0,
      });
    }
  }

  const [total, messages] = await Promise.all([
    prisma.message.count({ where: { conversationId } }),
    prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
      },
    }),
  ]);

  return {
    messages,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * Send a message within a conversation
 * Checks authorization, stores message, updates conversation, and broadcasts via Socket.IO
 */
async function sendMessage({ conversationId, senderId, content }) {
  if (!content || !content.trim()) {
    const err = new Error('Message content cannot be empty.');
    err.status = 400;
    throw err;
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      user1: { select: { id: true, firstName: true, lastName: true, profilePhoto: true } },
      user2: { select: { id: true, firstName: true, lastName: true, profilePhoto: true } },
    },
  });

  if (!conversation) {
    const err = new Error('Conversation not found');
    err.status = 404;
    throw err;
  }

  if (conversation.user1Id !== senderId && conversation.user2Id !== senderId) {
    const err = new Error('You are not authorized to send messages in this conversation.');
    err.status = 403;
    throw err;
  }

  const recipientId = conversation.user1Id === senderId ? conversation.user2Id : conversation.user1Id;

  // Verify connection authorization is still active
  const authCheck = await checkCanMessage(senderId, recipientId);
  if (!authCheck.allowed) {
    const err = new Error(authCheck.reason);
    err.status = 403;
    throw err;
  }

  const trimmedContent = content.trim();

  // Create message in PostgreSQL
  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      content: trimmedContent,
      isRead: false,
    },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
        },
      },
    },
  });

  // Update conversation last message timestamp & snippet
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageText: trimmedContent,
      lastMessageAt: message.createdAt,
    },
  });

  // Real-time broadcast via Socket.IO
  const io = getIO();
  if (io) {
    // 1. Emit to the active conversation room
    io.to(`conversation:${conversationId}`).emit('chat:new_message', {
      conversationId,
      message,
    });

    // 2. Emit directly to recipient's personal user room
    emitToUser(recipientId, 'chat:message_received', {
      conversationId,
      message,
      sender: message.sender,
    });

    // 3. Emit updated unread count to recipient
    const recipientUnreadCount = await prisma.message.count({
      where: {
        conversationId,
        senderId,
        isRead: false,
      },
    });

    emitToUser(recipientId, 'chat:unread_updated', {
      conversationId,
      unreadCount: recipientUnreadCount,
    });
  }

  return message;
}

/**
 * Mark messages in a conversation as read explicitly
 */
async function markConversationRead(conversationId, currentUserId) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) return { count: 0 };
  const otherUserId = conversation.user1Id === currentUserId ? conversation.user2Id : conversation.user1Id;

  const readAt = new Date();
  const updateResult = await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: otherUserId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt,
    },
  });

  const io = getIO();
  if (io) {
    io.to(`conversation:${conversationId}`).emit('chat:read_receipt', {
      conversationId,
      readBy: currentUserId,
      readAt,
    });
    emitToUser(currentUserId, 'chat:unread_updated', {
      conversationId,
      unreadCount: 0,
    });
  }

  return { count: updateResult.count };
}

/**
 * Get total unread messages count for a user across all conversations
 */
async function getTotalUnreadCount(userId) {
  const count = await prisma.message.count({
    where: {
      conversation: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      senderId: { not: userId },
      isRead: false,
    },
  });
  return count;
}

/**
 * Get list of all connected contacts with whom the user can chat
 * Returns users with accepted connection or mentorship
 */
async function getChatEligibleContacts(userId) {
  // 1. Accepted Connections
  const connections = await prisma.connection.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
      status: 'ACCEPTED',
    },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePhoto: true,
          role: true,
          alumniProfile: { select: { currentCompany: true, jobRole: true, branch: true } },
          studentProfile: { select: { branch: true, graduationYear: true } },
        },
      },
      receiver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePhoto: true,
          role: true,
          alumniProfile: { select: { currentCompany: true, jobRole: true, branch: true } },
          studentProfile: { select: { branch: true, graduationYear: true } },
        },
      },
    },
  });

  // 2. Accepted Mentorships
  const mentorships = await prisma.mentorshipRequest.findMany({
    where: {
      OR: [{ studentId: userId }, { alumniId: userId }],
      status: 'ACCEPTED',
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePhoto: true,
          role: true,
          studentProfile: { select: { branch: true, graduationYear: true } },
        },
      },
      alumni: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePhoto: true,
          role: true,
          alumniProfile: { select: { currentCompany: true, jobRole: true, branch: true } },
        },
      },
    },
  });

  const contactsMap = new Map();

  connections.forEach((c) => {
    const other = c.senderId === userId ? c.receiver : c.sender;
    if (other && !contactsMap.has(other.id)) {
      contactsMap.set(other.id, {
        ...other,
        connectionType: 'CONNECTION',
        isOnline: isUserOnline(other.id),
      });
    }
  });

  mentorships.forEach((m) => {
    const other = m.studentId === userId ? m.alumni : m.student;
    if (other && !contactsMap.has(other.id)) {
      contactsMap.set(other.id, {
        ...other,
        connectionType: 'MENTORSHIP',
        isOnline: isUserOnline(other.id),
      });
    }
  });

  return Array.from(contactsMap.values());
}

module.exports = {
  checkCanMessage,
  getOrCreateConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markConversationRead,
  getTotalUnreadCount,
  getChatEligibleContacts,
};
