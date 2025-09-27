'use strict';

const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const Task = require('../../models/Task');
const Notification = require('../../models/Notification');
const NotificationPreference = require('../../models/NotificationPreference');
const jwt = require('jsonwebtoken');

describe('Notifications API Integration Tests', () => {
  let userToken;
  let adminToken;
  let testUser;
  let adminUser;
  let testTask;

  beforeAll(async () => {
    // Create test users
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'user'
    });
    await testUser.save();

    adminUser = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin'
    });
    await adminUser.save();

    // Generate JWT tokens
    userToken = jwt.sign(
      { userId: testUser._id, role: testUser.role },
      process.env.JWT_SECRET || 'testsecret',
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { userId: adminUser._id, role: adminUser.role },
      process.env.JWT_SECRET || 'testsecret',
      { expiresIn: '1h' }
    );

    // Create test task
    testTask = new Task({
      title: 'Test Task',
      description: 'Test task for notifications',
      priority: 'medium',
      status: 'pending',
      createdBy: testUser._id,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    await testTask.save();
  });

  describe('GET /api/notifications', () => {
    beforeEach(async () => {
      // Create test notifications
      for (let i = 0; i < 5; i++) {
        await new Notification({
          type: 'task_due_soon',
          recipient: testUser._id,
          title: `Test notification ${i + 1}`,
          message: `Test message ${i + 1}`,
          relatedTask: testTask._id,
          channels: ['in_app'],
          status: 'delivered',
          read: i < 2 // First 2 are read, rest are unread
        }).save();
      }
    });

    it('should get user notifications with pagination', async () => {
      const response = await request(app)
        .get('/api/notifications?page=1&limit=3')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.pagination.total).toBe(5);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.pages).toBe(2);
    });

    it('should filter unread notifications only', async () => {
      const response = await request(app)
        .get('/api/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3); // 3 unread notifications
      response.body.data.forEach(notification => {
        expect(notification.read).toBe(false);
      });
    });

    it('should filter by notification type', async () => {
      // Create notification of different type
      await new Notification({
        type: 'task_assigned',
        recipient: testUser._id,
        title: 'Task assigned',
        message: 'New task assigned',
        channels: ['in_app'],
        status: 'delivered'
      }).save();

      const response = await request(app)
        .get('/api/notifications?type=task_assigned')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('task_assigned');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/notifications')
        .expect(401);
    });

    it('should not return other users notifications', async () => {
      // Create notification for admin user
      await new Notification({
        type: 'task_due_soon',
        recipient: adminUser._id,
        title: 'Admin notification',
        message: 'Admin message',
        channels: ['in_app'],
        status: 'delivered'
      }).save();

      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Should only return testUser's notifications, not admin's
      response.body.data.forEach(notification => {
        expect(notification.recipient).toBe(testUser._id.toString());
      });
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    beforeEach(async () => {
      // Create mix of read and unread notifications
      await new Notification({
        type: 'task_due_soon',
        recipient: testUser._id,
        title: 'Read notification',
        message: 'This is read',
        channels: ['in_app'],
        status: 'delivered',
        read: true,
        readAt: new Date()
      }).save();

      for (let i = 0; i < 3; i++) {
        await new Notification({
          type: 'task_due_soon',
          recipient: testUser._id,
          title: `Unread notification ${i + 1}`,
          message: 'This is unread',
          channels: ['in_app'],
          status: 'delivered',
          read: false
        }).save();
      }
    });

    it('should return correct unread count', async () => {
      const response = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(3);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/notifications/unread-count')
        .expect(401);
    });
  });

  describe('GET /api/notifications/preferences', () => {
    it('should get user notification preferences', async () => {
      const response = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('globalEnabled');
      expect(response.body.data).toHaveProperty('channels');
      expect(response.body.data).toHaveProperty('preferences');
      expect(response.body.data).toHaveProperty('quietHours');
    });

    it('should create default preferences if none exist', async () => {
      const response = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Should have default values
      expect(response.body.data.globalEnabled).toBe(true);
      expect(response.body.data.channels.email.enabled).toBe(true);
      expect(response.body.data.channels.inApp.enabled).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/notifications/preferences')
        .expect(401);
    });
  });

  describe('PUT /api/notifications/preferences', () => {
    it('should update user notification preferences', async () => {
      const preferences = {
        globalEnabled: false,
        channels: {
          email: { enabled: false },
          inApp: { enabled: true }
        },
        preferences: {
          taskDueSoon: { enabled: true, advance: 48 },
          taskDueUrgent: { enabled: false, advance: 1 }
        },
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00'
        }
      };

      const response = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .send(preferences)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.globalEnabled).toBe(false);
      expect(response.body.data.channels.email.enabled).toBe(false);
      expect(response.body.data.quietHours.enabled).toBe(true);
      expect(response.body.data.quietHours.start).toBe('22:00');
    });

    it('should validate preference data', async () => {
      const invalidPreferences = {
        globalEnabled: 'not-boolean',
        quietHours: {
          start: '25:00', // Invalid time format
          end: '08:00'
        }
      };

      await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidPreferences)
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .put('/api/notifications/preferences')
        .send({})
        .expect(401);
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    let testNotification;

    beforeEach(async () => {
      testNotification = await new Notification({
        type: 'task_due_soon',
        recipient: testUser._id,
        title: 'Test notification',
        message: 'Test message',
        channels: ['in_app'],
        status: 'delivered',
        read: false
      }).save();
    });

    it('should mark notification as read', async () => {
      const response = await request(app)
        .patch(`/api/notifications/${testNotification._id}/read`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.read).toBe(true);
      expect(response.body.data.readAt).toBeDefined();

      // Verify in database
      const updatedNotification = await Notification.findById(testNotification._id);
      expect(updatedNotification.read).toBe(true);
      expect(updatedNotification.readAt).toBeDefined();
    });

    it('should not allow marking another users notification as read', async () => {
      const otherNotification = await new Notification({
        type: 'task_due_soon',
        recipient: adminUser._id,
        title: 'Admin notification',
        message: 'Admin message',
        channels: ['in_app'],
        status: 'delivered',
        read: false
      }).save();

      await request(app)
        .patch(`/api/notifications/${otherNotification._id}/read`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('should handle invalid notification ID', async () => {
      await request(app)
        .patch('/api/notifications/invalid-id/read')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .patch(`/api/notifications/${testNotification._id}/read`)
        .expect(401);
    });
  });

  describe('PATCH /api/notifications/mark-all-read', () => {
    beforeEach(async () => {
      // Create multiple unread notifications
      for (let i = 0; i < 3; i++) {
        await new Notification({
          type: 'task_due_soon',
          recipient: testUser._id,
          title: `Unread notification ${i + 1}`,
          message: 'Unread message',
          channels: ['in_app'],
          status: 'delivered',
          read: false
        }).save();
      }
    });

    it('should mark all user notifications as read', async () => {
      const response = await request(app)
        .patch('/api/notifications/mark-all-read')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.modifiedCount).toBe(3);

      // Verify all notifications are marked as read
      const userNotifications = await Notification.find({ recipient: testUser._id });
      userNotifications.forEach(notification => {
        expect(notification.read).toBe(true);
      });
    });

    it('should not affect other users notifications', async () => {
      // Create unread notification for admin
      const adminNotification = await new Notification({
        type: 'task_due_soon',
        recipient: adminUser._id,
        title: 'Admin notification',
        message: 'Admin message',
        channels: ['in_app'],
        status: 'delivered',
        read: false
      }).save();

      await request(app)
        .patch('/api/notifications/mark-all-read')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Verify admin notification is still unread
      const updatedAdminNotification = await Notification.findById(adminNotification._id);
      expect(updatedAdminNotification.read).toBe(false);
    });

    it('should require authentication', async () => {
      await request(app)
        .patch('/api/notifications/mark-all-read')
        .expect(401);
    });
  });

  describe('POST /api/notifications/test (Admin only)', () => {
    it('should send test notification as admin', async () => {
      const testData = {
        type: 'task_due_soon',
        recipient: testUser._id.toString(),
        testData: {
          taskTitle: 'Test Task',
          userName: 'Test User',
          dueDate: 'tomorrow',
          priority: 'high'
        }
      };

      const response = await request(app)
        .post('/api/notifications/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Test notification sent');
    });

    it('should reject test notification from non-admin user', async () => {
      const testData = {
        type: 'task_due_soon',
        recipient: testUser._id.toString()
      };

      await request(app)
        .post('/api/notifications/test')
        .set('Authorization', `Bearer ${userToken}`)
        .send(testData)
        .expect(403);
    });

    it('should validate test notification data', async () => {
      const invalidData = {
        type: 'invalid_type',
        recipient: 'invalid-id'
      };

      await request(app)
        .post('/api/notifications/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/notifications/test')
        .send({})
        .expect(401);
    });
  });

  describe('GET /api/notifications/stats (Admin only)', () => {
    beforeEach(async () => {
      // Create notifications with different statuses and dates
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const today = new Date();

      await new Notification({
        type: 'task_due_soon',
        recipient: testUser._id,
        title: 'Yesterday notification',
        message: 'Yesterday message',
        channels: ['email'],
        status: 'sent',
        createdAt: yesterday
      }).save();

      await new Notification({
        type: 'task_due_urgent',
        recipient: testUser._id,
        title: 'Today notification',
        message: 'Today message',
        channels: ['email'],
        status: 'failed',
        createdAt: today
      }).save();
    });

    it('should get notification statistics as admin', async () => {
      const response = await request(app)
        .get('/api/notifications/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalNotifications');
      expect(response.body.data).toHaveProperty('byStatus');
      expect(response.body.data).toHaveProperty('byType');
      expect(response.body.data).toHaveProperty('byChannel');
      expect(response.body.data).toHaveProperty('daily');
    });

    it('should filter statistics by date range', async () => {
      const startDate = new Date().toISOString().split('T')[0]; // Today's date
      const endDate = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/notifications/stats?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should only include today's notifications
      expect(response.body.data.totalNotifications).toBeGreaterThanOrEqual(1);
    });

    it('should reject non-admin user', async () => {
      await request(app)
        .get('/api/notifications/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/notifications/stats')
        .expect(401);
    });
  });

  describe('POST /api/notifications/process (Admin only)', () => {
    beforeEach(async () => {
      // Create pending notifications that are due for processing
      const pastDue = new Date(Date.now() - 60 * 1000); // 1 minute ago

      await new Notification({
        type: 'task_due_soon',
        recipient: testUser._id,
        title: 'Due notification',
        message: 'This should be processed',
        scheduledFor: pastDue,
        channels: ['email'],
        status: 'pending'
      }).save();
    });

    it('should manually trigger notification processing as admin', async () => {
      const response = await request(app)
        .post('/api/notifications/process')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('processed');
      expect(response.body.data).toHaveProperty('successful');
      expect(response.body.data).toHaveProperty('failed');
    });

    it('should reject non-admin user', async () => {
      await request(app)
        .post('/api/notifications/process')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/notifications/process')
        .expect(401);
    });
  });

  describe('Error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Temporarily close database connection to simulate error
      const originalFind = Notification.find;
      Notification.find = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Internal server error');

      // Restore original method
      Notification.find = originalFind;
    });

    it('should handle malformed request data', async () => {
      await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .send('invalid json')
        .expect(400);
    });
  });
});