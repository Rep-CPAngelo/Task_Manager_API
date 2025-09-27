'use strict';

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> Set of socketIds
    this.userSockets = new Map(); // socketId -> userId
  }

  /**
   * Initialize Socket.IO server
   * @param {Object} httpServer - HTTP server instance
   */
  initialize(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });

    // Connection handling
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    console.log('🔌 WebSocket service initialized');
  }

  /**
   * Handle new socket connection
   * @param {Object} socket - Socket instance
   */
  handleConnection(socket) {
    const userId = socket.userId;
    const socketId = socket.id;

    // Track user connections
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId).add(socketId);
    this.userSockets.set(socketId, userId);

    console.log(`🔗 User ${socket.user.name} connected (${socketId})`);

    // Join user to their personal room
    socket.join(`user:${userId}`);

    // Handle board subscriptions
    socket.on('join_board', (boardId) => {
      socket.join(`board:${boardId}`);
      console.log(`📋 User ${socket.user.name} joined board ${boardId}`);
    });

    socket.on('leave_board', (boardId) => {
      socket.leave(`board:${boardId}`);
      console.log(`📋 User ${socket.user.name} left board ${boardId}`);
    });

    // Handle task subscriptions
    socket.on('join_task', (taskId) => {
      socket.join(`task:${taskId}`);
      console.log(`📝 User ${socket.user.name} joined task ${taskId}`);
    });

    socket.on('leave_task', (taskId) => {
      socket.leave(`task:${taskId}`);
      console.log(`📝 User ${socket.user.name} left task ${taskId}`);
    });

    // Handle real-time typing indicators
    socket.on('typing_start', (data) => {
      socket.to(`task:${data.taskId}`).emit('user_typing', {
        userId: socket.userId,
        userName: socket.user.name,
        taskId: data.taskId,
        field: data.field
      });
    });

    socket.on('typing_stop', (data) => {
      socket.to(`task:${data.taskId}`).emit('user_stopped_typing', {
        userId: socket.userId,
        taskId: data.taskId,
        field: data.field
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });

    // Send welcome message
    socket.emit('connected', {
      message: 'Successfully connected to real-time updates',
      userId: socket.userId,
      timestamp: new Date()
    });
  }

  /**
   * Handle socket disconnection
   * @param {Object} socket - Socket instance
   */
  handleDisconnection(socket) {
    const userId = socket.userId;
    const socketId = socket.id;

    if (userId && this.connectedUsers.has(userId)) {
      this.connectedUsers.get(userId).delete(socketId);

      // Remove user mapping if no more connections
      if (this.connectedUsers.get(userId).size === 0) {
        this.connectedUsers.delete(userId);
      }
    }

    this.userSockets.delete(socketId);
    console.log(`🔌 User ${socket.user?.name || 'Unknown'} disconnected (${socketId})`);
  }

  /**
   * Emit task update to all subscribers
   * @param {String} taskId - Task ID
   * @param {Object} update - Update data
   * @param {String} userId - User who made the change
   */
  emitTaskUpdate(taskId, update, userId = null) {
    if (!this.io) return;

    const event = {
      taskId,
      update,
      updatedBy: userId,
      timestamp: new Date()
    };

    this.io.to(`task:${taskId}`).emit('task_updated', event);
    console.log(`📝 Task update emitted for task ${taskId}`);
  }

  /**
   * Emit board update to all subscribers
   * @param {String} boardId - Board ID
   * @param {Object} update - Update data
   * @param {String} userId - User who made the change
   */
  emitBoardUpdate(boardId, update, userId = null) {
    if (!this.io) return;

    const event = {
      boardId,
      update,
      updatedBy: userId,
      timestamp: new Date()
    };

    this.io.to(`board:${boardId}`).emit('board_updated', event);
    console.log(`📋 Board update emitted for board ${boardId}`);
  }

  /**
   * Emit notification to specific user
   * @param {String} userId - User ID
   * @param {Object} notification - Notification data
   */
  emitNotification(userId, notification) {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date()
    });

    console.log(`🔔 Notification sent to user ${userId}`);
  }

  /**
   * Emit activity feed update
   * @param {String} boardId - Board ID (optional)
   * @param {Object} activity - Activity data
   */
  emitActivity(activity, boardId = null) {
    if (!this.io) return;

    const event = {
      ...activity,
      timestamp: new Date()
    };

    if (boardId) {
      this.io.to(`board:${boardId}`).emit('activity_update', event);
    } else {
      this.io.emit('global_activity', event);
    }

    console.log(`📈 Activity update emitted${boardId ? ` for board ${boardId}` : ' globally'}`);
  }

  /**
   * Get connected users count
   * @returns {Number} Number of connected users
   */
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  /**
   * Check if user is connected
   * @param {String} userId - User ID
   * @returns {Boolean} True if user is connected
   */
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get connected users in a room
   * @param {String} room - Room name
   * @returns {Array} Array of connected user IDs
   */
  getUsersInRoom(room) {
    if (!this.io) return [];

    const roomData = this.io.sockets.adapter.rooms.get(room);
    if (!roomData) return [];

    const userIds = [];
    for (const socketId of roomData) {
      const userId = this.userSockets.get(socketId);
      if (userId && !userIds.includes(userId)) {
        userIds.push(userId);
      }
    }

    return userIds;
  }

  /**
   * Broadcast system announcement
   * @param {Object} announcement - Announcement data
   */
  broadcastAnnouncement(announcement) {
    if (!this.io) return;

    this.io.emit('system_announcement', {
      ...announcement,
      timestamp: new Date()
    });

    console.log('📢 System announcement broadcasted');
  }
}

// Export singleton instance
module.exports = new WebSocketService();