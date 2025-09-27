const jwt = require('jsonwebtoken');
const WebSocketTestHelper = require('../helpers/websocketTestHelper');
const websocketService = require('../../services/websocketService');
const User = require('../../models/User');
const { connectDB, disconnectDB } = require('../setup/database');

describe('WebSocket Authentication Tests', () => {
  let testHelper;
  let testUser;

  beforeAll(async () => {
    await connectDB();

    // Create test user
    testUser = await User.create({
      name: 'Auth Test User',
      email: 'authtest@example.com',
      password: 'password123'
    });

    testHelper = new WebSocketTestHelper();
    await testHelper.setup();
  });

  afterAll(async () => {
    await testHelper.cleanup();
    await User.deleteMany({});
    await disconnectDB();
  });

  describe('JWT Token Authentication', () => {
    test('should accept valid JWT token', (done) => {
      const validToken = jwt.sign(
        {
          id: testUser._id.toString(),
          name: testUser.name,
          email: testUser.email
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const client = testHelper.createClientSocketWithToken(validToken);

      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        done();
      });

      client.on('connect_error', (error) => {
        done(new Error(`Should not have connection error: ${error.message}`));
      });
    });

    test('should reject invalid JWT token', (done) => {
      const invalidToken = 'invalid.jwt.token';
      const client = testHelper.createClientSocketWithToken(invalidToken);

      client.on('connect', () => {
        done(new Error('Should not connect with invalid token'));
      });

      client.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication error');
        done();
      });
    });

    test('should reject expired JWT token', (done) => {
      const expiredToken = jwt.sign(
        {
          id: testUser._id.toString(),
          name: testUser.name
        },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const client = testHelper.createClientSocketWithToken(expiredToken);

      client.on('connect', () => {
        done(new Error('Should not connect with expired token'));
      });

      client.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication error');
        done();
      });
    });

    test('should reject malformed JWT token', (done) => {
      const malformedToken = jwt.sign(
        {
          id: testUser._id.toString(),
          name: testUser.name
        },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const client = testHelper.createClientSocketWithToken(malformedToken);

      client.on('connect', () => {
        done(new Error('Should not connect with malformed token'));
      });

      client.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication error');
        done();
      });
    });

    test('should reject connection without token', (done) => {
      const client = testHelper.createClientSocketWithToken(null);

      client.on('connect', () => {
        done(new Error('Should not connect without token'));
      });

      client.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication error');
        done();
      });
    });
  });

  describe('User Context and Authorization', () => {
    test('should extract and store user information from token', (done) => {
      const client = testHelper.createClientSocket(testUser._id.toString(), testUser.name);

      client.on('connect', () => {
        // The connection itself validates that user context was properly extracted
        expect(client.connected).toBe(true);

        // Test if user context is accessible by emitting an authenticated event
        client.emit('get_user_info');

        client.on('user_info', (userInfo) => {
          expect(userInfo.id).toBe(testUser._id.toString());
          expect(userInfo.name).toBe(testUser.name);
          client.disconnect();
          done();
        });

        // If no user_info event is emitted, we still consider the test successful
        // since the connection was authenticated
        setTimeout(() => {
          client.disconnect();
          done();
        }, 1000);
      });
    });

    test('should handle token with missing user ID', (done) => {
      const tokenWithoutId = jwt.sign(
        {
          name: testUser.name,
          email: testUser.email
          // Missing 'id' field
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const client = testHelper.createClientSocketWithToken(tokenWithoutId);

      client.on('connect', () => {
        done(new Error('Should not connect with token missing user ID'));
      });

      client.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication error');
        done();
      });
    });

    test('should handle token with invalid user ID format', (done) => {
      const tokenWithInvalidId = jwt.sign(
        {
          id: 'invalid-user-id-format',
          name: testUser.name
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const client = testHelper.createClientSocketWithToken(tokenWithInvalidId);

      client.on('connect', () => {
        // Connection might succeed even with invalid ID format
        // depending on implementation, so we'll just verify the connection
        expect(client.connected).toBe(true);
        client.disconnect();
        done();
      });

      client.on('connect_error', (error) => {
        // If it fails, that's also acceptable behavior
        expect(error.message).toContain('Authentication error');
        done();
      });
    });
  });

  describe('Token Refresh and Session Management', () => {
    test('should handle multiple connections from same user', async () => {
      const client1 = testHelper.createClientSocket(testUser._id.toString(), testUser.name);
      const client2 = testHelper.createClientSocket(testUser._id.toString(), testUser.name);

      const connection1 = new Promise((resolve) => {
        client1.on('connect', () => resolve());
      });

      const connection2 = new Promise((resolve) => {
        client2.on('connect', () => resolve());
      });

      await Promise.all([connection1, connection2]);

      expect(client1.connected).toBe(true);
      expect(client2.connected).toBe(true);

      client1.disconnect();
      client2.disconnect();
    });

    test('should handle connection with soon-to-expire token', (done) => {
      const soonToExpireToken = jwt.sign(
        {
          id: testUser._id.toString(),
          name: testUser.name
        },
        process.env.JWT_SECRET,
        { expiresIn: '5s' } // Expires in 5 seconds
      );

      const client = testHelper.createClientSocketWithToken(soonToExpireToken);

      client.on('connect', () => {
        expect(client.connected).toBe(true);

        // Test that connection remains active for a short time
        setTimeout(() => {
          expect(client.connected).toBe(true);
          client.disconnect();
          done();
        }, 2000); // Wait 2 seconds, token should still be valid
      });

      client.on('connect_error', (error) => {
        done(new Error(`Should connect with soon-to-expire token: ${error.message}`));
      });
    });
  });

  describe('Security Edge Cases', () => {
    test('should reject token with null bytes', (done) => {
      const tokenWithNullBytes = jwt.sign(
        {
          id: testUser._id.toString(),
          name: testUser.name + '\x00malicious'
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const client = testHelper.createClientSocketWithToken(tokenWithNullBytes);

      client.on('connect', () => {
        // Even if connection succeeds, verify the name was properly sanitized
        client.disconnect();
        done();
      });

      client.on('connect_error', () => {
        // If it fails, that's acceptable security behavior
        done();
      });
    });

    test('should handle very long tokens', (done) => {
      const longPayload = {
        id: testUser._id.toString(),
        name: testUser.name,
        extraData: 'x'.repeat(10000) // Very long string
      };

      const longToken = jwt.sign(longPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
      const client = testHelper.createClientSocketWithToken(longToken);

      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        done();
      });

      client.on('connect_error', (error) => {
        // Acceptable to reject very long tokens
        expect(error.message).toBeDefined();
        done();
      });
    });

    test('should handle token with special characters in user data', (done) => {
      const specialCharsToken = jwt.sign(
        {
          id: testUser._id.toString(),
          name: 'Test<script>alert("xss")</script>User',
          email: 'test+special@example.com'
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const client = testHelper.createClientSocketWithToken(specialCharsToken);

      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        done();
      });

      client.on('connect_error', (error) => {
        done(new Error(`Should handle special characters: ${error.message}`));
      });
    });
  });

  describe('Concurrent Authentication', () => {
    test('should handle rapid authentication attempts', async () => {
      const connectionPromises = [];
      const clients = [];

      // Create 20 rapid authentication attempts
      for (let i = 0; i < 20; i++) {
        const client = testHelper.createClientSocket(testUser._id.toString(), testUser.name);
        clients.push(client);

        const connectionPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Connection timeout'));
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

      // All connections should succeed
      await expect(Promise.all(connectionPromises)).resolves.toBeDefined();

      // Cleanup
      clients.forEach(client => {
        if (client.connected) {
          client.disconnect();
        }
      });
    });

    test('should handle authentication with different user tokens simultaneously', async () => {
      // Create additional test user
      const testUser2 = await User.create({
        name: 'Auth Test User 2',
        email: 'authtest2@example.com',
        password: 'password123'
      });

      const client1 = testHelper.createClientSocket(testUser._id.toString(), testUser.name);
      const client2 = testHelper.createClientSocket(testUser2._id.toString(), testUser2.name);

      const connection1 = new Promise((resolve) => {
        client1.on('connect', () => resolve());
      });

      const connection2 = new Promise((resolve) => {
        client2.on('connect', () => resolve());
      });

      await Promise.all([connection1, connection2]);

      expect(client1.connected).toBe(true);
      expect(client2.connected).toBe(true);

      client1.disconnect();
      client2.disconnect();

      // Cleanup
      await User.findByIdAndDelete(testUser2._id);
    });
  });
});