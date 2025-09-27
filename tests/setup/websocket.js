/**
 * WebSocket Test Setup and Teardown Utilities
 * Provides global setup and teardown for WebSocket tests
 */

const WebSocketTestHelper = require('../helpers/websocketTestHelper');
const websocketService = require('../../services/websocketService');

let globalTestHelper;

/**
 * Global WebSocket test setup
 * Called before all WebSocket tests
 */
const setupWebSocketTests = async () => {
  if (!globalTestHelper) {
    globalTestHelper = new WebSocketTestHelper();
    await globalTestHelper.setup();
  }
  return globalTestHelper;
};

/**
 * Global WebSocket test teardown
 * Called after all WebSocket tests
 */
const teardownWebSocketTests = async () => {
  if (globalTestHelper) {
    await globalTestHelper.cleanup();
    globalTestHelper = null;
  }

  // Ensure WebSocket service is properly closed
  if (websocketService.io) {
    websocketService.io.close();
  }
};

/**
 * Setup WebSocket test environment for a single test suite
 */
const setupTestSuite = async () => {
  const testHelper = new WebSocketTestHelper();
  await testHelper.setup();
  return testHelper;
};

/**
 * Teardown WebSocket test environment for a single test suite
 */
const teardownTestSuite = async (testHelper) => {
  if (testHelper) {
    await testHelper.cleanup();
  }
};

/**
 * Clean up all active connections
 * Utility function to ensure no connections leak between tests
 */
const cleanupActiveConnections = async () => {
  if (websocketService.io) {
    // Get all connected sockets
    const sockets = await websocketService.io.fetchSockets();

    // Disconnect all sockets
    sockets.forEach(socket => {
      socket.disconnect(true);
    });
  }
};

/**
 * Reset WebSocket service state
 * Clears all rooms and connections
 */
const resetWebSocketState = async () => {
  if (websocketService.io) {
    // Clear all rooms
    websocketService.io.sockets.adapter.rooms.clear();

    // Clear all socket mappings
    if (websocketService.userSockets) {
      websocketService.userSockets.clear();
    }
  }
};

/**
 * Wait for WebSocket server to be ready
 */
const waitForServerReady = (server, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('WebSocket server failed to start within timeout'));
    }, timeout);

    if (server.listening) {
      clearTimeout(timer);
      resolve();
    } else {
      server.once('listening', () => {
        clearTimeout(timer);
        resolve();
      });
    }
  });
};

/**
 * Create isolated test environment
 * Returns a completely isolated WebSocket test environment
 */
const createIsolatedTestEnvironment = async () => {
  const testHelper = new WebSocketTestHelper();
  await testHelper.setup();

  return {
    testHelper,
    cleanup: async () => {
      await testHelper.cleanup();
    },
    createSocket: (userId, userName) => testHelper.createClientSocket(userId, userName),
    createSocketWithToken: (token) => testHelper.createClientSocketWithToken(token),
    waitForEvent: (socket, event, timeout) => testHelper.waitForEvent(socket, event, timeout)
  };
};

/**
 * Verify WebSocket service health
 */
const verifyWebSocketHealth = () => {
  const health = {
    serviceInitialized: !!websocketService.io,
    serverRunning: websocketService.io ? websocketService.io.engine.clientsCount >= 0 : false,
    activeConnections: websocketService.io ? websocketService.io.engine.clientsCount : 0,
    activeRooms: websocketService.io ? websocketService.io.sockets.adapter.rooms.size : 0
  };

  return health;
};

/**
 * Mock WebSocket events for testing
 */
const mockWebSocketEvents = {
  taskUpdate: (taskId, updateData, userId) => ({
    type: 'task_update',
    taskId,
    data: updateData,
    userId,
    timestamp: new Date().toISOString()
  }),

  boardUpdate: (boardId, updateData) => ({
    type: 'board_update',
    boardId,
    data: updateData,
    timestamp: new Date().toISOString()
  }),

  notification: (userId, message, type = 'info') => ({
    type: 'notification',
    userId,
    message,
    notificationType: type,
    timestamp: new Date().toISOString()
  }),

  userTyping: (userId, userName, boardId, taskId) => ({
    type: 'user_typing',
    userId,
    userName,
    boardId,
    taskId,
    timestamp: new Date().toISOString()
  }),

  userStoppedTyping: (userId, boardId, taskId) => ({
    type: 'user_stopped_typing',
    userId,
    boardId,
    taskId,
    timestamp: new Date().toISOString()
  })
};

/**
 * Test data generators
 */
const generateTestData = {
  user: (id = 'test-user', name = 'Test User') => ({
    _id: id,
    id: id,
    name: name,
    email: `${name.toLowerCase().replace(' ', '')}@test.com`,
    role: 'user'
  }),

  task: (id = 'test-task', createdBy = 'test-user') => ({
    _id: id,
    title: 'Test Task',
    description: 'Test task description',
    status: 'todo',
    priority: 'medium',
    createdBy: createdBy,
    assignedTo: null,
    board: 'test-board',
    createdAt: new Date(),
    updatedAt: new Date()
  }),

  board: (id = 'test-board', owner = 'test-user') => ({
    _id: id,
    name: 'Test Board',
    description: 'Test board description',
    createdBy: owner,
    members: [owner],
    createdAt: new Date(),
    updatedAt: new Date()
  })
};

module.exports = {
  setupWebSocketTests,
  teardownWebSocketTests,
  setupTestSuite,
  teardownTestSuite,
  cleanupActiveConnections,
  resetWebSocketState,
  waitForServerReady,
  createIsolatedTestEnvironment,
  verifyWebSocketHealth,
  mockWebSocketEvents,
  generateTestData
};