'use strict';

const WebSocketTestHelper = require('../helpers/websocketTestHelper');
const websocketService = require('../../services/websocketService');
const User = require('../../models/User');

describe('WebSocket Service', () => {
  let testHelper;
  let testUser;

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });

    testHelper = new WebSocketTestHelper();
    await testHelper.setupServer();
  });

  afterAll(async () => {
    if (testHelper) {
      await testHelper.cleanup();
    }
  });

  afterEach(async () => {
    // Clean up client sockets after each test
    if (testHelper && testHelper.clientSockets) {
      for (const socket of testHelper.clientSockets) {
        if (socket.connected) {
          socket.disconnect();
        }
      }
      testHelper.clientSockets = [];
    }
  });

  describe('Connection and Authentication', () => {
    test('should successfully connect with valid JWT token', async () => {
      const socket = testHelper.createClientSocket(testUser._id.toString(), testUser.name);
      await testHelper.assertSocketAuthenticated(socket);
      expect(socket.connected).toBe(true);
    });

    test('should reject connection with invalid JWT token', async () => {
      const socket = testHelper.createInvalidClientSocket();
      await testHelper.assertSocketAuthenticationFailed(socket);
      expect(socket.connected).toBe(false);
    });

    test('should reject connection without token', async () => {
      const socket = testHelper.createClientSocket();
      socket.auth = {}; // Remove token
      await testHelper.assertSocketAuthenticationFailed(socket);
    });

    test('should handle multiple concurrent connections', async () => {
      const socket1 = testHelper.createClientSocket('user1', 'John Doe');
      const socket2 = testHelper.createClientSocket('user2', 'Jane Smith');
      const socket3 = testHelper.createClientSocket('user3', 'Bob Johnson');

      await Promise.all([
        testHelper.assertSocketAuthenticated(socket1),
        testHelper.assertSocketAuthenticated(socket2),
        testHelper.assertSocketAuthenticated(socket3)
      ]);

      expect(websocketService.getConnectedUsersCount()).toBe(3);
    });

    test('should track user connections correctly', async () => {
      const socket1 = testHelper.createClientSocket('user1', 'John Doe');
      const socket2 = testHelper.createClientSocket('user1', 'John Doe'); // Same user, different connection

      await testHelper.assertSocketAuthenticated(socket1);
      await testHelper.assertSocketAuthenticated(socket2);

      expect(websocketService.isUserConnected('user1')).toBe(true);
      expect(websocketService.getConnectedUsersCount()).toBe(1); // Same user
    });

    test('should clean up connections on disconnect', async () => {
      const socket = testHelper.createClientSocket('user1', 'John Doe');
      await testHelper.assertSocketAuthenticated(socket);

      expect(websocketService.isUserConnected('user1')).toBe(true);

      socket.disconnect();

      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(websocketService.isUserConnected('user1')).toBe(false);
    });
  });

  describe('Room Management', () => {
    let socket;

    beforeEach(async () => {
      socket = testHelper.createClientSocket('user1', 'John Doe');
      await testHelper.assertSocketAuthenticated(socket);
    });

    test('should join and leave board rooms', async () => {
      const boardId = 'test-board-123';

      // Join board room
      socket.emit('join_board', boardId);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if user is in room
      const usersInRoom = websocketService.getUsersInRoom(`board:${boardId}`);
      expect(usersInRoom).toContain('user1');

      // Leave board room
      socket.emit('leave_board', boardId);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if user left room
      const usersAfterLeave = websocketService.getUsersInRoom(`board:${boardId}`);
      expect(usersAfterLeave).not.toContain('user1');
    });

    test('should join and leave task rooms', async () => {
      const taskId = 'test-task-456';

      // Join task room
      socket.emit('join_task', taskId);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if user is in room
      const usersInRoom = websocketService.getUsersInRoom(`task:${taskId}`);
      expect(usersInRoom).toContain('user1');

      // Leave task room
      socket.emit('leave_task', taskId);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if user left room
      const usersAfterLeave = websocketService.getUsersInRoom(`task:${taskId}`);
      expect(usersAfterLeave).not.toContain('user1');
    });

    test('should handle multiple users in same room', async () => {
      const socket2 = testHelper.createClientSocket('user2', 'Jane Smith');
      await testHelper.assertSocketAuthenticated(socket2);

      const boardId = 'test-board-123';

      // Both users join the same board
      socket.emit('join_board', boardId);
      socket2.emit('join_board', boardId);

      await new Promise(resolve => setTimeout(resolve, 100));

      const usersInRoom = websocketService.getUsersInRoom(`board:${boardId}`);
      expect(usersInRoom).toContain('user1');
      expect(usersInRoom).toContain('user2');
      expect(usersInRoom.length).toBe(2);
    });
  });

  describe('Typing Indicators', () => {
    let socket1, socket2;

    beforeEach(async () => {
      socket1 = testHelper.createClientSocket('user1', 'John Doe');
      socket2 = testHelper.createClientSocket('user2', 'Jane Smith');

      await Promise.all([
        testHelper.assertSocketAuthenticated(socket1),
        testHelper.assertSocketAuthenticated(socket2)
      ]);

      // Both users join the same task room
      const taskId = 'test-task-123';
      socket1.emit('join_task', taskId);
      socket2.emit('join_task', taskId);

      await new Promise(resolve => setTimeout(resolve, 100));
    });

    test('should broadcast typing start events', async () => {
      const taskId = 'test-task-123';
      const field = 'description';

      // Set up listener on socket2
      const typingPromise = testHelper.waitForEvent(socket2, 'user_typing');

      // socket1 starts typing
      socket1.emit('typing_start', { taskId, field });

      const typingData = await typingPromise;
      expect(typingData.userId).toBe('user1');
      expect(typingData.userName).toBe('John Doe');
      expect(typingData.taskId).toBe(taskId);
      expect(typingData.field).toBe(field);
    });

    test('should broadcast typing stop events', async () => {
      const taskId = 'test-task-123';
      const field = 'description';

      // Set up listener on socket2
      const stoppedTypingPromise = testHelper.waitForEvent(socket2, 'user_stopped_typing');

      // socket1 stops typing
      socket1.emit('typing_stop', { taskId, field });

      const stoppedTypingData = await stoppedTypingPromise;
      expect(stoppedTypingData.userId).toBe('user1');
      expect(stoppedTypingData.taskId).toBe(taskId);
      expect(stoppedTypingData.field).toBe(field);
    });

    test('should not broadcast typing events to sender', async () => {
      const taskId = 'test-task-123';
      const field = 'description';

      let receivedOwnTyping = false;
      socket1.on('user_typing', () => {
        receivedOwnTyping = true;
      });

      socket1.emit('typing_start', { taskId, field });

      // Wait a bit to see if socket1 receives its own typing event
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(receivedOwnTyping).toBe(false);
    });
  });

  describe('Event Broadcasting', () => {
    let socket1, socket2;

    beforeEach(async () => {
      socket1 = testHelper.createClientSocket('user1', 'John Doe');
      socket2 = testHelper.createClientSocket('user2', 'Jane Smith');

      await Promise.all([
        testHelper.assertSocketAuthenticated(socket1),
        testHelper.assertSocketAuthenticated(socket2)
      ]);
    });

    test('should emit task updates to task subscribers', async () => {
      const taskId = 'test-task-123';
      const mockTask = testHelper.createMockTask(taskId);

      // Both users subscribe to task updates
      socket1.emit('join_task', taskId);
      socket2.emit('join_task', taskId);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Set up listeners
      const task1Promise = testHelper.waitForEvent(socket1, 'task_updated');
      const task2Promise = testHelper.waitForEvent(socket2, 'task_updated');

      // Emit task update
      websocketService.emitTaskUpdate(taskId, {
        type: 'task_updated',
        task: mockTask,
        changes: { title: 'Updated Title' }
      }, 'user3');

      const [event1, event2] = await Promise.all([task1Promise, task2Promise]);

      expect(event1.taskId).toBe(taskId);
      expect(event1.update.type).toBe('task_updated');
      expect(event1.updatedBy).toBe('user3');

      expect(event2.taskId).toBe(taskId);
      expect(event2.update.type).toBe('task_updated');
    });

    test('should emit board updates to board subscribers', async () => {
      const boardId = 'test-board-123';
      const mockBoard = testHelper.createMockBoard(boardId);

      // Both users subscribe to board updates
      socket1.emit('join_board', boardId);
      socket2.emit('join_board', boardId);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Set up listeners
      const board1Promise = testHelper.waitForEvent(socket1, 'board_updated');
      const board2Promise = testHelper.waitForEvent(socket2, 'board_updated');

      // Emit board update
      websocketService.emitBoardUpdate(boardId, {
        type: 'task_added',
        board: mockBoard,
        taskId: 'new-task-id'
      }, 'user3');

      const [event1, event2] = await Promise.all([board1Promise, board2Promise]);

      expect(event1.boardId).toBe(boardId);
      expect(event1.update.type).toBe('task_added');
      expect(event1.updatedBy).toBe('user3');

      expect(event2.boardId).toBe(boardId);
      expect(event2.update.type).toBe('task_added');
    });

    test('should emit notifications to specific users', async () => {
      const mockNotification = testHelper.createMockNotification('user1');

      // Set up listener only on socket1 (user1)
      const notificationPromise = testHelper.waitForEvent(socket1, 'notification');

      // Emit notification to user1
      websocketService.emitNotification('user1', mockNotification);

      const receivedNotification = await notificationPromise;

      expect(receivedNotification.id).toBe(mockNotification._id);
      expect(receivedNotification.type).toBe(mockNotification.type);
      expect(receivedNotification.title).toBe(mockNotification.title);
      expect(receivedNotification.message).toBe(mockNotification.message);
    });

    test('should broadcast system announcements to all users', async () => {
      const announcement = {
        title: 'System Maintenance',
        message: 'System will be down for maintenance at 2 AM',
        priority: 'high'
      };

      // Set up listeners on both sockets
      const announcement1Promise = testHelper.waitForEvent(socket1, 'system_announcement');
      const announcement2Promise = testHelper.waitForEvent(socket2, 'system_announcement');

      // Broadcast announcement
      websocketService.broadcastAnnouncement(announcement);

      const [received1, received2] = await Promise.all([announcement1Promise, announcement2Promise]);

      expect(received1.title).toBe(announcement.title);
      expect(received1.message).toBe(announcement.message);
      expect(received1.priority).toBe(announcement.priority);

      expect(received2.title).toBe(announcement.title);
      expect(received2.message).toBe(announcement.message);
    });

    test('should not emit events to unsubscribed users', async () => {
      const taskId = 'test-task-123';

      // Only socket1 subscribes to task updates
      socket1.emit('join_task', taskId);
      await new Promise(resolve => setTimeout(resolve, 100));

      let socket2ReceivedEvent = false;
      socket2.on('task_updated', () => {
        socket2ReceivedEvent = true;
      });

      // Set up listener only on socket1
      const taskPromise = testHelper.waitForEvent(socket1, 'task_updated');

      // Emit task update
      websocketService.emitTaskUpdate(taskId, {
        type: 'task_updated',
        task: testHelper.createMockTask(taskId)
      }, 'user3');

      await taskPromise;

      // Wait a bit to see if socket2 received the event
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(socket2ReceivedEvent).toBe(false);
    });
  });

  describe('Connection State Management', () => {
    test('should correctly report connected users count', async () => {
      expect(websocketService.getConnectedUsersCount()).toBe(0);

      const socket1 = testHelper.createClientSocket('user1', 'John Doe');
      await testHelper.assertSocketAuthenticated(socket1);
      expect(websocketService.getConnectedUsersCount()).toBe(1);

      const socket2 = testHelper.createClientSocket('user2', 'Jane Smith');
      await testHelper.assertSocketAuthenticated(socket2);
      expect(websocketService.getConnectedUsersCount()).toBe(2);

      socket1.disconnect();
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(websocketService.getConnectedUsersCount()).toBe(1);

      socket2.disconnect();
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(websocketService.getConnectedUsersCount()).toBe(0);
    });

    test('should correctly identify connected users', async () => {
      expect(websocketService.isUserConnected('user1')).toBe(false);

      const socket = testHelper.createClientSocket('user1', 'John Doe');
      await testHelper.assertSocketAuthenticated(socket);

      expect(websocketService.isUserConnected('user1')).toBe(true);
      expect(websocketService.isUserConnected('user2')).toBe(false);

      socket.disconnect();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(websocketService.isUserConnected('user1')).toBe(false);
    });

    test('should handle rapid connect/disconnect cycles', async () => {
      for (let i = 0; i < 5; i++) {
        const socket = testHelper.createClientSocket(`user${i}`, `User ${i}`);
        await testHelper.assertSocketAuthenticated(socket);
        socket.disconnect();
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // All should be disconnected
      expect(websocketService.getConnectedUsersCount()).toBe(0);
    });
  });
});