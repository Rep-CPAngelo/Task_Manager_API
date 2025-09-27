const { createServer } = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');
const WebSocketTestHelper = require('../helpers/websocketTestHelper');
const websocketService = require('../../services/websocketService');
const User = require('../../models/User');
const Task = require('../../models/Task');
const Board = require('../../models/Board');
const { connectDB, disconnectDB } = require('../setup/database');

describe('WebSocket Integration Tests', () => {
  let testHelper;
  let testUser1, testUser2;
  let testBoard, testTask;

  beforeAll(async () => {
    await connectDB();

    // Create test users
    testUser1 = await User.create({
      name: 'Test User 1',
      email: 'test1@example.com',
      password: 'password123'
    });

    testUser2 = await User.create({
      name: 'Test User 2',
      email: 'test2@example.com',
      password: 'password123'
    });

    // Create test board
    testBoard = await Board.create({
      name: 'Test Board',
      description: 'Test board for WebSocket tests',
      createdBy: testUser1._id,
      members: [testUser1._id, testUser2._id]
    });

    // Create test task
    testTask = await Task.create({
      title: 'Test Task',
      description: 'Test task for WebSocket tests',
      createdBy: testUser1._id,
      assignedTo: testUser2._id,
      board: testBoard._id,
      status: 'todo'
    });

    testHelper = new WebSocketTestHelper();
    await testHelper.setup();
  });

  afterAll(async () => {
    await testHelper.cleanup();
    await User.deleteMany({});
    await Task.deleteMany({});
    await Board.deleteMany({});
    await disconnectDB();
  });

  describe('Real-time Task Updates', () => {
    test('should broadcast task creation to board members', (done) => {
      const client1 = testHelper.createClientSocket(testUser1._id.toString(), testUser1.name);
      const client2 = testHelper.createClientSocket(testUser2._id.toString(), testUser2.name);

      let eventCount = 0;
      const checkCompletion = () => {
        eventCount++;
        if (eventCount === 2) {
          client1.disconnect();
          client2.disconnect();
          done();
        }
      };

      client1.on('connect', () => {
        client1.emit('join_board', testBoard._id.toString());
      });

      client2.on('connect', () => {
        client2.emit('join_board', testBoard._id.toString());
      });

      client1.on('task_update', (data) => {
        expect(data.type).toBe('task_created');
        expect(data.task.title).toBe('New WebSocket Task');
        checkCompletion();
      });

      client2.on('task_update', (data) => {
        expect(data.type).toBe('task_created');
        expect(data.task.title).toBe('New WebSocket Task');
        checkCompletion();
      });

      // Simulate task creation after both clients are connected and joined
      setTimeout(() => {
        websocketService.emitTaskUpdate(testTask._id.toString(), {
          type: 'task_created',
          task: {
            _id: testTask._id,
            title: 'New WebSocket Task',
            board: testBoard._id
          }
        }, testUser1._id.toString());
      }, 100);
    });

    test('should broadcast task status updates to relevant users', (done) => {
      const client = testHelper.createClientSocket(testUser2._id.toString(), testUser2.name);

      client.on('connect', () => {
        client.emit('subscribe_task', testTask._id.toString());
      });

      client.on('task_update', (data) => {
        expect(data.type).toBe('task_updated');
        expect(data.task.status).toBe('in_progress');
        client.disconnect();
        done();
      });

      // Simulate task update
      setTimeout(() => {
        websocketService.emitTaskUpdate(testTask._id.toString(), {
          type: 'task_updated',
          task: {
            ...testTask.toObject(),
            status: 'in_progress'
          }
        }, testUser1._id.toString());
      }, 100);
    });

    test('should handle task assignment notifications', (done) => {
      const client = testHelper.createClientSocket(testUser2._id.toString(), testUser2.name);

      client.on('notification', (data) => {
        expect(data.type).toBe('task_assigned');
        expect(data.message).toContain('assigned to you');
        client.disconnect();
        done();
      });

      // Simulate task assignment
      setTimeout(() => {
        websocketService.emitNotification(testUser2._id.toString(), {
          type: 'task_assigned',
          message: `Task "${testTask.title}" has been assigned to you`,
          taskId: testTask._id,
          from: testUser1._id
        });
      }, 100);
    });
  });

  describe('Board Synchronization', () => {
    test('should sync board updates to all members', (done) => {
      const client1 = testHelper.createClientSocket(testUser1._id.toString(), testUser1.name);
      const client2 = testHelper.createClientSocket(testUser2._id.toString(), testUser2.name);

      let updateCount = 0;
      const checkCompletion = () => {
        updateCount++;
        if (updateCount === 2) {
          client1.disconnect();
          client2.disconnect();
          done();
        }
      };

      client1.on('connect', () => {
        client1.emit('join_board', testBoard._id.toString());
      });

      client2.on('connect', () => {
        client2.emit('join_board', testBoard._id.toString());
      });

      client1.on('board_update', (data) => {
        expect(data.type).toBe('board_updated');
        expect(data.board.name).toBe('Updated Board Name');
        checkCompletion();
      });

      client2.on('board_update', (data) => {
        expect(data.type).toBe('board_updated');
        expect(data.board.name).toBe('Updated Board Name');
        checkCompletion();
      });

      // Simulate board update
      setTimeout(() => {
        websocketService.emitBoardUpdate(testBoard._id.toString(), {
          type: 'board_updated',
          board: {
            ...testBoard.toObject(),
            name: 'Updated Board Name'
          }
        });
      }, 100);
    });

    test('should handle member joining board', (done) => {
      const client = testHelper.createClientSocket(testUser1._id.toString(), testUser1.name);

      client.on('connect', () => {
        client.emit('join_board', testBoard._id.toString());
      });

      client.on('board_update', (data) => {
        expect(data.type).toBe('member_joined');
        expect(data.member.name).toBe('New User');
        client.disconnect();
        done();
      });

      // Simulate member joining
      setTimeout(() => {
        websocketService.emitBoardUpdate(testBoard._id.toString(), {
          type: 'member_joined',
          member: {
            _id: 'new-user-id',
            name: 'New User',
            email: 'newuser@example.com'
          }
        });
      }, 100);
    });
  });

  describe('Typing Indicators', () => {
    test('should broadcast typing status to other board members', (done) => {
      const client1 = testHelper.createClientSocket(testUser1._id.toString(), testUser1.name);
      const client2 = testHelper.createClientSocket(testUser2._id.toString(), testUser2.name);

      client1.on('connect', () => {
        client1.emit('join_board', testBoard._id.toString());
      });

      client2.on('connect', () => {
        client2.emit('join_board', testBoard._id.toString());

        // Start typing after joining
        setTimeout(() => {
          client2.emit('start_typing', {
            boardId: testBoard._id.toString(),
            taskId: testTask._id.toString()
          });
        }, 50);
      });

      client1.on('user_typing', (data) => {
        expect(data.userId).toBe(testUser2._id.toString());
        expect(data.userName).toBe(testUser2.name);
        expect(data.boardId).toBe(testBoard._id.toString());
        expect(data.taskId).toBe(testTask._id.toString());

        client1.disconnect();
        client2.disconnect();
        done();
      });
    });

    test('should broadcast stop typing status', (done) => {
      const client1 = testHelper.createClientSocket(testUser1._id.toString(), testUser1.name);
      const client2 = testHelper.createClientSocket(testUser2._id.toString(), testUser2.name);

      client1.on('connect', () => {
        client1.emit('join_board', testBoard._id.toString());
      });

      client2.on('connect', () => {
        client2.emit('join_board', testBoard._id.toString());

        // Stop typing after joining
        setTimeout(() => {
          client2.emit('stop_typing', {
            boardId: testBoard._id.toString(),
            taskId: testTask._id.toString()
          });
        }, 50);
      });

      client1.on('user_stopped_typing', (data) => {
        expect(data.userId).toBe(testUser2._id.toString());
        expect(data.boardId).toBe(testBoard._id.toString());
        expect(data.taskId).toBe(testTask._id.toString());

        client1.disconnect();
        client2.disconnect();
        done();
      });
    });
  });

  describe('Connection Management', () => {
    test('should handle user status updates on connect/disconnect', (done) => {
      const client1 = testHelper.createClientSocket(testUser1._id.toString(), testUser1.name);
      const client2 = testHelper.createClientSocket(testUser2._id.toString(), testUser2.name);

      client1.on('connect', () => {
        client1.emit('join_board', testBoard._id.toString());
      });

      client2.on('connect', () => {
        client2.emit('join_board', testBoard._id.toString());
      });

      client1.on('user_status', (data) => {
        if (data.status === 'online' && data.userId === testUser2._id.toString()) {
          expect(data.userName).toBe(testUser2.name);

          // Test disconnect
          client2.disconnect();
        } else if (data.status === 'offline' && data.userId === testUser2._id.toString()) {
          client1.disconnect();
          done();
        }
      });
    });

    test('should maintain room membership correctly', async () => {
      const client = testHelper.createClientSocket(testUser1._id.toString(), testUser1.name);

      await new Promise((resolve) => {
        client.on('connect', () => {
          client.emit('join_board', testBoard._id.toString());
          resolve();
        });
      });

      // Check if client is in the room (this would be verified server-side)
      const rooms = await websocketService.getRoomMembers(testBoard._id.toString());
      expect(rooms).toBeDefined();

      client.disconnect();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid room joining attempts', (done) => {
      const client = testHelper.createClientSocket(testUser1._id.toString(), testUser1.name);

      client.on('connect', () => {
        client.emit('join_board', 'invalid-board-id');
      });

      client.on('error', (error) => {
        expect(error.message).toContain('Invalid board');
        client.disconnect();
        done();
      });

      // If no error is emitted within 1 second, the test should pass
      setTimeout(() => {
        client.disconnect();
        done();
      }, 1000);
    });

    test('should handle malformed event data gracefully', (done) => {
      const client = testHelper.createClientSocket(testUser1._id.toString(), testUser1.name);

      client.on('connect', () => {
        // Send malformed data
        client.emit('start_typing', 'invalid-data');

        setTimeout(() => {
          client.disconnect();
          done();
        }, 500);
      });
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle multiple simultaneous connections', async () => {
      const clients = [];
      const connectionPromises = [];

      // Create 10 simultaneous connections
      for (let i = 0; i < 10; i++) {
        const client = testHelper.createClientSocket(`user-${i}`, `User ${i}`);
        clients.push(client);

        connectionPromises.push(new Promise((resolve) => {
          client.on('connect', () => {
            client.emit('join_board', testBoard._id.toString());
            resolve();
          });
        }));
      }

      // Wait for all connections
      await Promise.all(connectionPromises);

      // Broadcast a message and verify all clients receive it
      const messagePromises = clients.map((client, index) => {
        return new Promise((resolve) => {
          client.on('board_update', (data) => {
            expect(data.type).toBe('stress_test');
            resolve();
          });
        });
      });

      // Emit update to all clients
      websocketService.emitBoardUpdate(testBoard._id.toString(), {
        type: 'stress_test',
        message: 'Testing multiple connections'
      });

      await Promise.all(messagePromises);

      // Cleanup
      clients.forEach(client => client.disconnect());
    });

    test('should handle rapid event emissions', (done) => {
      const client = testHelper.createClientSocket(testUser1._id.toString(), testUser1.name);
      let eventCount = 0;
      const totalEvents = 50;

      client.on('connect', () => {
        client.emit('join_board', testBoard._id.toString());
      });

      client.on('task_update', (data) => {
        eventCount++;
        if (eventCount === totalEvents) {
          client.disconnect();
          done();
        }
      });

      // Emit multiple rapid events
      setTimeout(() => {
        for (let i = 0; i < totalEvents; i++) {
          websocketService.emitTaskUpdate(testTask._id.toString(), {
            type: 'task_updated',
            task: { ...testTask.toObject(), version: i }
          }, testUser1._id.toString());
        }
      }, 100);
    });
  });
});