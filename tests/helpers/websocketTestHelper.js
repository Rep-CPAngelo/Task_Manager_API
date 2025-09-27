'use strict';

const { createServer } = require('http');
const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');
const websocketService = require('../../services/websocketService');

class WebSocketTestHelper {
  constructor() {
    this.server = null;
    this.httpServer = null;
    this.clientSockets = [];
    this.port = 0;
  }

  /**
   * Complete setup including server and utilities
   */
  async setup() {
    await this.setupServer();
  }

  /**
   * Setup test WebSocket server
   */
  async setupServer() {
    // Create HTTP server for testing
    this.httpServer = createServer();

    // Initialize WebSocket service
    websocketService.initialize(this.httpServer);

    // Start server on random port
    return new Promise((resolve) => {
      this.httpServer.listen(0, () => {
        this.port = this.httpServer.address().port;
        resolve(this.port);
      });
    });
  }

  /**
   * Create authenticated client socket
   */
  createClientSocket(userId = 'test-user-id', userName = 'Test User') {
    const token = jwt.sign(
      { id: userId, name: userName },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    const socket = io(`http://localhost:${this.port}`, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true
    });

    this.clientSockets.push(socket);
    return socket;
  }

  /**
   * Create client socket with custom token
   */
  createClientSocketWithToken(token) {
    const socket = io(`http://localhost:${this.port}`, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true
    });

    this.clientSockets.push(socket);
    return socket;
  }

  /**
   * Create client socket with invalid token
   */
  createInvalidClientSocket() {
    const socket = io(`http://localhost:${this.port}`, {
      auth: { token: 'invalid-token' },
      transports: ['websocket'],
      forceNew: true
    });

    this.clientSockets.push(socket);
    return socket;
  }

  /**
   * Wait for socket event with timeout
   */
  waitForEvent(socket, eventName, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeout);

      socket.once(eventName, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  /**
   * Wait for multiple sockets to receive the same event
   */
  waitForEventOnMultipleSockets(sockets, eventName, timeout = 5000) {
    const promises = sockets.map(socket =>
      this.waitForEvent(socket, eventName, timeout)
    );
    return Promise.all(promises);
  }

  /**
   * Clean up all sockets and server
   */
  async cleanup() {
    // Disconnect all client sockets
    for (const socket of this.clientSockets) {
      if (socket.connected) {
        socket.disconnect();
      }
    }
    this.clientSockets = [];

    // Close HTTP server
    if (this.httpServer) {
      return new Promise((resolve) => {
        this.httpServer.close(() => {
          resolve();
        });
      });
    }
  }

  /**
   * Create mock user data for testing
   */
  createMockUser(id = 'test-user-id', name = 'Test User') {
    return {
      _id: id,
      id: id,
      name: name,
      email: `${name.toLowerCase().replace(' ', '')}@test.com`,
      role: 'user'
    };
  }

  /**
   * Create mock task data for testing
   */
  createMockTask(id = 'test-task-id', createdBy = 'test-user-id') {
    return {
      _id: id,
      title: 'Test Task',
      description: 'Test task description',
      status: 'pending',
      priority: 'medium',
      createdBy: createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Create mock board data for testing
   */
  createMockBoard(id = 'test-board-id', owner = 'test-user-id') {
    return {
      _id: id,
      title: 'Test Board',
      description: 'Test board description',
      owner: owner,
      columns: [
        { _id: 'col1', title: 'To Do', position: 0 },
        { _id: 'col2', title: 'In Progress', position: 1 },
        { _id: 'col3', title: 'Done', position: 2 }
      ],
      members: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Create mock notification data for testing
   */
  createMockNotification(recipient = 'test-user-id') {
    return {
      _id: 'test-notification-id',
      type: 'task_assigned',
      title: 'Task Assigned',
      message: 'You have been assigned a new task',
      recipient: recipient,
      relatedTask: 'test-task-id',
      relatedUser: 'test-user-2',
      createdAt: new Date()
    };
  }

  /**
   * Assert socket authentication success
   */
  async assertSocketAuthenticated(socket) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Socket authentication timeout'));
      }, 5000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Authentication failed: ${error.message}`));
      });
    });
  }

  /**
   * Assert socket authentication failure
   */
  async assertSocketAuthenticationFailed(socket) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Expected authentication failure but socket connected'));
      }, 5000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        reject(new Error('Expected authentication failure but socket connected'));
      });

      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        resolve(error);
      });
    });
  }
}

module.exports = WebSocketTestHelper;