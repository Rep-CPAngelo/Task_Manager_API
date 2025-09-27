/**
 * WebSocket Performance Tests
 * Tests WebSocket performance under various load conditions
 */

const WebSocketTestHelper = require('../helpers/websocketTestHelper');
const { createIsolatedTestEnvironment, generateTestData } = require('../setup/websocket');
const { connectDB, disconnectDB } = require('../setup/database');

describe('WebSocket Performance Tests', () => {
  let testEnvironment;

  beforeAll(async () => {
    await connectDB();
    testEnvironment = await createIsolatedTestEnvironment();
  });

  afterAll(async () => {
    await testEnvironment.cleanup();
    await disconnectDB();
  });

  describe('Connection Performance', () => {
    test('should handle 100 concurrent connections within 5 seconds', async () => {
      const startTime = Date.now();
      const connectionPromises = [];
      const clients = [];

      // Create 100 concurrent connections
      for (let i = 0; i < 100; i++) {
        const client = testEnvironment.createSocket(`user-${i}`, `User ${i}`);
        clients.push(client);

        const connectionPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Connection ${i} timeout`));
          }, 5000);

          client.on('connect', () => {
            clearTimeout(timeout);
            resolve();
          });

          client.on('connect_error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });

        connectionPromises.push(connectionPromise);
      }

      await Promise.all(connectionPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000);
      console.log(`✓ 100 concurrent connections established in ${duration}ms`);

      // Cleanup
      clients.forEach(client => client.disconnect());
    }, 10000);

    test('should handle rapid connect/disconnect cycles', async () => {
      const cycles = 50;
      const startTime = Date.now();

      for (let i = 0; i < cycles; i++) {
        const client = testEnvironment.createSocket(`cycle-user-${i}`, `Cycle User ${i}`);

        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Cycle ${i} connect timeout`));
          }, 1000);

          client.on('connect', () => {
            clearTimeout(timeout);
            client.disconnect();
            resolve();
          });
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgCycleTime = duration / cycles;

      expect(avgCycleTime).toBeLessThan(100); // Average cycle should be under 100ms
      console.log(`✓ ${cycles} connect/disconnect cycles completed in ${duration}ms (avg: ${avgCycleTime.toFixed(2)}ms per cycle)`);
    }, 15000);
  });

  describe('Message Broadcasting Performance', () => {
    test('should broadcast to 50 clients within 500ms', async () => {
      const clientCount = 50;
      const clients = [];
      const board = generateTestData.board();

      // Create and connect clients
      for (let i = 0; i < clientCount; i++) {
        const client = testEnvironment.createSocket(`broadcast-user-${i}`, `Broadcast User ${i}`);
        clients.push(client);

        await new Promise((resolve) => {
          client.on('connect', () => {
            client.emit('join_board', board._id);
            resolve();
          });
        });
      }

      // Set up listeners
      const messagePromises = clients.map((client, index) => {
        return new Promise((resolve) => {
          client.on('board_update', (data) => {
            resolve({ clientIndex: index, data });
          });
        });
      });

      // Broadcast message and measure time
      const startTime = Date.now();

      // Simulate broadcasting through service
      setTimeout(() => {
        clients.forEach(client => {
          client.emit('board_update', {
            type: 'performance_test',
            timestamp: startTime,
            board: board
          });
        });
      }, 50);

      const results = await Promise.all(messagePromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results.length).toBe(clientCount);
      expect(duration).toBeLessThan(500);
      console.log(`✓ Broadcasted to ${clientCount} clients in ${duration}ms`);

      // Cleanup
      clients.forEach(client => client.disconnect());
    }, 10000);

    test('should handle high-frequency events without memory leaks', async () => {
      const client = testEnvironment.createSocket('frequency-user', 'Frequency User');
      const eventCount = 1000;
      let receivedCount = 0;

      await new Promise((resolve) => {
        client.on('connect', resolve);
      });

      const startTime = Date.now();
      const initialMemory = process.memoryUsage();

      // Set up event listener
      client.on('high_frequency_event', () => {
        receivedCount++;
      });

      // Send high-frequency events
      for (let i = 0; i < eventCount; i++) {
        client.emit('high_frequency_event', {
          eventNumber: i,
          data: `Event data ${i}`,
          timestamp: Date.now()
        });
      }

      // Wait for all events to be processed
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (receivedCount >= eventCount) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 10);
      });

      const endTime = Date.now();
      const finalMemory = process.memoryUsage();
      const duration = endTime - startTime;
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(receivedCount).toBe(eventCount);
      expect(duration).toBeLessThan(2000);
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase

      console.log(`✓ Processed ${eventCount} events in ${duration}ms`);
      console.log(`✓ Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      client.disconnect();
    }, 15000);
  });

  describe('Room Management Performance', () => {
    test('should handle joining/leaving rooms efficiently', async () => {
      const roomCount = 20;
      const clientsPerRoom = 10;
      const clients = [];

      const startTime = Date.now();

      // Create clients and join multiple rooms
      for (let roomIndex = 0; roomIndex < roomCount; roomIndex++) {
        const roomId = `performance-room-${roomIndex}`;

        for (let clientIndex = 0; clientIndex < clientsPerRoom; clientIndex++) {
          const client = testEnvironment.createSocket(
            `room-user-${roomIndex}-${clientIndex}`,
            `Room User ${roomIndex}-${clientIndex}`
          );
          clients.push(client);

          await new Promise((resolve) => {
            client.on('connect', () => {
              client.emit('join_board', roomId);
              resolve();
            });
          });
        }
      }

      const joinTime = Date.now();
      const joinDuration = joinTime - startTime;

      // Leave all rooms
      const leavePromises = clients.map((client, index) => {
        return new Promise((resolve) => {
          const roomIndex = Math.floor(index / clientsPerRoom);
          const roomId = `performance-room-${roomIndex}`;

          client.emit('leave_board', roomId);
          setTimeout(resolve, 10); // Small delay to simulate processing
        });
      });

      await Promise.all(leavePromises);

      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      const leaveDuration = endTime - joinTime;

      expect(joinDuration).toBeLessThan(3000);
      expect(leaveDuration).toBeLessThan(1000);

      console.log(`✓ ${roomCount} rooms with ${clientsPerRoom} clients each:`);
      console.log(`  Join time: ${joinDuration}ms`);
      console.log(`  Leave time: ${leaveDuration}ms`);
      console.log(`  Total time: ${totalDuration}ms`);

      // Cleanup
      clients.forEach(client => client.disconnect());
    }, 20000);
  });

  describe('Authentication Performance', () => {
    test('should authenticate 100 users within 2 seconds', async () => {
      const userCount = 100;
      const startTime = Date.now();
      const authPromises = [];

      for (let i = 0; i < userCount; i++) {
        const authPromise = new Promise((resolve, reject) => {
          const client = testEnvironment.createSocket(`auth-user-${i}`, `Auth User ${i}`);

          const timeout = setTimeout(() => {
            reject(new Error(`Authentication timeout for user ${i}`));
          }, 2000);

          client.on('connect', () => {
            clearTimeout(timeout);
            client.disconnect();
            resolve();
          });

          client.on('connect_error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });

        authPromises.push(authPromise);
      }

      await Promise.all(authPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000);
      console.log(`✓ Authenticated ${userCount} users in ${duration}ms`);
    }, 10000);
  });

  describe('Error Handling Performance', () => {
    test('should handle invalid events without degrading performance', async () => {
      const client = testEnvironment.createSocket('error-user', 'Error User');
      const validEventCount = 100;
      const invalidEventCount = 50;
      let validEventsReceived = 0;

      await new Promise((resolve) => {
        client.on('connect', resolve);
      });

      const startTime = Date.now();

      // Set up listener for valid events
      client.on('valid_event', () => {
        validEventsReceived++;
      });

      // Send mix of valid and invalid events
      for (let i = 0; i < validEventCount; i++) {
        client.emit('valid_event', { data: `valid-${i}` });
      }

      for (let i = 0; i < invalidEventCount; i++) {
        // Send various types of invalid events
        client.emit('invalid_event_name', { data: 'invalid' });
        client.emit('valid_event', 'invalid-data-format');
        client.emit('', { data: 'empty-event-name' });
      }

      // Wait for valid events to be processed
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (validEventsReceived >= validEventCount) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 10);
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(validEventsReceived).toBe(validEventCount);
      expect(duration).toBeLessThan(1000);

      console.log(`✓ Processed ${validEventCount} valid events with ${invalidEventCount} invalid events in ${duration}ms`);

      client.disconnect();
    }, 10000);
  });

  describe('Memory and Resource Usage', () => {
    test('should maintain stable memory usage under sustained load', async () => {
      const initialMemory = process.memoryUsage();
      const clients = [];
      const loadDuration = 5000; // 5 seconds of sustained load

      // Create persistent connections
      for (let i = 0; i < 20; i++) {
        const client = testEnvironment.createSocket(`memory-user-${i}`, `Memory User ${i}`);
        clients.push(client);

        await new Promise((resolve) => {
          client.on('connect', resolve);
        });
      }

      const midMemory = process.memoryUsage();

      // Generate sustained load
      const startTime = Date.now();
      const loadInterval = setInterval(() => {
        clients.forEach((client, index) => {
          client.emit('load_test_event', {
            clientIndex: index,
            timestamp: Date.now(),
            data: `Load test data ${Date.now()}`
          });
        });
      }, 100);

      // Run load for specified duration
      await new Promise((resolve) => {
        setTimeout(() => {
          clearInterval(loadInterval);
          resolve();
        }, loadDuration);
      });

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - midMemory.heapUsed;

      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase

      console.log(`✓ Memory usage after ${loadDuration}ms sustained load:`);
      console.log(`  Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  After connections: ${(midMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  After load: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // Cleanup
      clients.forEach(client => client.disconnect());

      // Allow garbage collection
      await new Promise(resolve => setTimeout(resolve, 1000));
    }, 15000);
  });
});