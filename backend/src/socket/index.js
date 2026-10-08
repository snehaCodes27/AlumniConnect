const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

let io = null;
const userSockets = new Map(); // userId -> Set of socket IDs
const communityRooms = new Map(); // eventId -> Set of socket IDs / user info

/**
 * Initialize Socket.IO with HTTP Server
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [config.clientUrl, 'http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // JWT Authentication Middleware for Sockets
  io.use((socket, next) => {
    try {
      const rawToken =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

      if (!rawToken) {
        return next(new Error('Authentication token missing in socket handshake'));
      }

      const decoded = jwt.verify(rawToken, config.jwtSecret);
      socket.user = decoded;
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      console.warn('[Socket.IO Auth Error]:', err.message);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`[Socket.IO] Client connected: user=${userId}, socket=${socket.id}`);

    // Join personal user room for direct targeting
    socket.join(`user:${userId}`);

    // Track active sockets
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    // Broadcast user online status
    io.emit('user:online', { userId, count: userSockets.get(userId).size });

    // Handle client ping/heartbeat
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // ── Event Community Real-Time Messaging & Updates ──────────────────────
    socket.on('community:join', ({ eventId, userName }) => {
      if (!eventId) return;
      const room = `event-community:${eventId}`;
      socket.join(room);
      socket.currentCommunityEventId = eventId;
      socket.communityUserName = userName || 'Participant';

      if (!communityRooms.has(eventId)) {
        communityRooms.set(eventId, new Map());
      }
      communityRooms.get(eventId).set(socket.id, {
        userId: socket.userId,
        userName: socket.communityUserName,
      });

      console.log(`[Socket.IO Community] User ${userId} (${socket.communityUserName}) joined ${room}`);

      const activeMembers = Array.from(communityRooms.get(eventId).values());
      // Emit online member count to room
      io.to(room).emit('community:members-updated', {
        eventId,
        count: activeMembers.length,
        members: activeMembers,
      });
    });

    socket.on('community:leave', ({ eventId }) => {
      if (!eventId) return;
      const room = `event-community:${eventId}`;
      socket.leave(room);

      if (communityRooms.has(eventId)) {
        communityRooms.get(eventId).delete(socket.id);
        const activeMembers = Array.from(communityRooms.get(eventId).values());
        io.to(room).emit('community:members-updated', {
          eventId,
          count: activeMembers.length,
          members: activeMembers,
        });
      }
      socket.currentCommunityEventId = null;
    });

    socket.on('community:send-message', ({ eventId, message }) => {
      if (!eventId || !message) return;
      const room = `event-community:${eventId}`;
      const payload = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        eventId,
        senderId: socket.userId,
        senderName: socket.communityUserName || socket.user?.firstName || 'Participant',
        text: message.text || message,
        createdAt: new Date().toISOString(),
      };

      io.to(room).emit('community:new-message', payload);
    });

    socket.on('community:typing', ({ eventId, isTyping }) => {
      if (!eventId) return;
      const room = `event-community:${eventId}`;
      socket.to(room).emit('community:user-typing', {
        userId: socket.userId,
        userName: socket.communityUserName || 'Someone',
        isTyping,
      });
    });

    // ── Domain & Career Community Events ─────────────────────────────────
    socket.on('domain_community:join', ({ communityId }) => {
      if (!communityId) return;
      socket.join(`community:${communityId}`);
    });

    socket.on('domain_community:leave', ({ communityId }) => {
      if (!communityId) return;
      socket.leave(`community:${communityId}`);
    });

    socket.on('domain_community:typing', ({ communityId, isTyping }) => {
      if (!communityId) return;
      socket.to(`community:${communityId}`).emit('community:user_typing', {
        userId: socket.userId,
        userName: socket.user?.firstName || 'Someone',
        isTyping,
      });
    });

    socket.on('community_post:join', ({ postId }) => {
      if (!postId) return;
      socket.join(`community_post:${postId}`);
    });

    socket.on('community_post:leave', ({ postId }) => {
      if (!postId) return;
      socket.leave(`community_post:${postId}`);
    });

    // ── Direct 1-on-1 Student-Alumni Chat Events ──────────────────────────
    socket.on('chat:join', ({ conversationId }) => {
      if (!conversationId) return;
      const room = `conversation:${conversationId}`;
      socket.join(room);
      console.log(`[Socket.IO Chat] User ${userId} joined room ${room}`);
    });

    socket.on('chat:leave', ({ conversationId }) => {
      if (!conversationId) return;
      const room = `conversation:${conversationId}`;
      socket.leave(room);
      console.log(`[Socket.IO Chat] User ${userId} left room ${room}`);
    });

    socket.on('chat:typing', ({ conversationId, isTyping }) => {
      if (!conversationId) return;
      const room = `conversation:${conversationId}`;
      socket.to(room).emit('chat:user_typing', {
        conversationId,
        userId: socket.userId,
        userName: socket.user?.firstName || 'User',
        isTyping,
      });
    });

    socket.on('chat:check_online', ({ userIds }, callback) => {
      if (!Array.isArray(userIds)) return;
      const statusMap = {};
      userIds.forEach((id) => {
        statusMap[id] = userSockets.has(id) && userSockets.get(id).size > 0;
      });
      if (typeof callback === 'function') {
        callback(statusMap);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: user=${userId}, socket=${socket.id}`);

      if (socket.currentCommunityEventId) {
        const eventId = socket.currentCommunityEventId;
        const room = `event-community:${eventId}`;
        if (communityRooms.has(eventId)) {
          communityRooms.get(eventId).delete(socket.id);
          const activeMembers = Array.from(communityRooms.get(eventId).values());
          io.to(room).emit('community:members-updated', {
            eventId,
            count: activeMembers.length,
            members: activeMembers,
          });
        }
      }

      if (userSockets.has(userId)) {
        userSockets.get(userId).delete(socket.id);
        if (userSockets.get(userId).size === 0) {
          userSockets.delete(userId);
          io.emit('user:offline', { userId });
        }
      }
    });
  });

  return io;
};

/**
 * Get the initialized Socket.IO instance
 */
const getIO = () => {
  if (!io) {
    console.warn('[Socket.IO] getIO called before initSocket was executed.');
  }
  return io;
};

/**
 * Emit real-time event to a specific user across all their connected devices/tabs
 */
const emitToUser = (userId, event, payload) => {
  if (!io) return false;
  io.to(`user:${userId}`).emit(event, payload);
  return true;
};

/**
 * Broadcast event to an entire event community room
 */
const emitToCommunity = (eventId, event, payload) => {
  if (!io) return false;
  io.to(`event-community:${eventId}`).emit(event, payload);
  return true;
};

/**
 * Check if a user currently has at least one active socket connection
 */
const isUserOnline = (userId) => {
  return userSockets.has(userId) && userSockets.get(userId).size > 0;
};

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToCommunity,
  isUserOnline,
};
