'use strict';

const NotificationService = require('../../services/notificationService');
const emailService = require('../../services/emailService');
const Notification = require('../../models/Notification');
const NotificationPreference = require('../../models/NotificationPreference');
const Task = require('../../models/Task');
const User = require('../../models/User');
const mongoose = require('mongoose');

// Mock the email service
jest.mock('../../services/emailService', () => ({
  sendEmail: jest.fn(),
  sendBulkEmails: jest.fn()
}));

describe('NotificationService Unit Tests', () => {
  let notificationService;
  let testUser;
  let testTask;

  beforeAll(() => {
    notificationService = NotificationService;
  });

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create test user
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'user'
    });
    await testUser.save();

    // Create test task
    testTask = new Task({
      title: 'Test Task',
      description: 'Test description',
      priority: 'medium',
      status: 'pending',
      createdBy: testUser._id,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Due in 24 hours
    });
    await testTask.save();
  });

  describe('createNotification', () => {
    it('should create a notification successfully', async () => {
      const notificationData = {
        type: 'task_due_soon',
        recipient: testUser._id,
        title: 'Task due soon',
        message: 'Your task is due soon',
        relatedTask: testTask._id,
        scheduledFor: new Date(),
        channels: ['email', 'in_app']
      };

      const notification = await notificationService.createNotification(notificationData);

      expect(notification).toBeDefined();
      expect(notification.type).toBe('task_due_soon');
      expect(notification.recipient).toEqual(testUser._id);
      expect(notification.title).toBe('Task due soon');
      expect(notification.relatedTask).toEqual(testTask._id);
    });

    it('should save notification to database', async () => {
      const notificationData = {
        type: 'task_assigned',
        recipient: testUser._id,
        title: 'New task assigned',
        message: 'A new task has been assigned to you',
        channels: ['email']
      };

      const notification = await notificationService.createNotification(notificationData);
      const savedNotification = await Notification.findById(notification._id);

      expect(savedNotification).toBeDefined();
      expect(savedNotification.type).toBe('task_assigned');
      expect(savedNotification.status).toBe('pending');
    });
  });

  describe('scheduleNotification', () => {
    it('should schedule notification when user preferences allow', async () => {
      // Create user preferences
      const preferences = await NotificationPreference.getOrCreatePreferences(testUser._id);
      preferences.globalEnabled = true;
      preferences.channels.email.enabled = true;
      preferences.preferences.taskDueSoon.enabled = true;
      await preferences.save();

      const options = {
        type: 'task_due_soon',
        recipient: testUser._id,
        title: 'Task due soon',
        message: 'Your task is due soon',
        relatedTask: testTask._id,
        scheduledFor: new Date(Date.now() + 60 * 1000),
        channels: ['email', 'in_app']
      };

      const notification = await notificationService.scheduleNotification(options);

      expect(notification).toBeDefined();
      expect(notification.type).toBe('task_due_soon');
      expect(notification.channels).toContain('email');
    });

    it('should return null when notifications are disabled in preferences', async () => {
      // Create user preferences with notifications disabled
      const preferences = await NotificationPreference.getOrCreatePreferences(testUser._id);
      preferences.globalEnabled = false;
      await preferences.save();

      const options = {
        type: 'task_due_soon',
        recipient: testUser._id,
        title: 'Task due soon',
        message: 'Your task is due soon',
        channels: ['email']
      };

      const notification = await notificationService.scheduleNotification(options);
      expect(notification).toBeNull();
    });

    it('should filter channels based on user preferences', async () => {
      // Create preferences with only email enabled
      const preferences = await NotificationPreference.getOrCreatePreferences(testUser._id);
      preferences.globalEnabled = true;
      preferences.channels.email.enabled = true;
      preferences.channels.inApp.enabled = false;
      await preferences.save();

      const options = {
        type: 'task_due_soon',
        recipient: testUser._id,
        title: 'Task due soon',
        message: 'Your task is due soon',
        channels: ['email', 'in_app']
      };

      const notification = await notificationService.scheduleNotification(options);

      expect(notification).toBeDefined();
      expect(notification.channels).toContain('email');
      expect(notification.channels).not.toContain('in_app');
    });

    it('should respect quiet hours when specified', async () => {
      const preferences = await NotificationPreference.getOrCreatePreferences(testUser._id);
      preferences.globalEnabled = true;
      preferences.quietHours.enabled = true;
      preferences.quietHours.start = '22:00';
      preferences.quietHours.end = '08:00';
      await preferences.save();

      // Schedule notification during quiet hours (23:00)
      const quietTime = new Date();
      quietTime.setHours(23, 0, 0, 0);

      const options = {
        type: 'task_due_soon',
        recipient: testUser._id,
        title: 'Task due soon',
        message: 'Your task is due soon',
        scheduledFor: quietTime,
        channels: ['email']
      };

      const notification = await notificationService.scheduleNotification(options);

      expect(notification).toBeDefined();
      // Should be rescheduled to after quiet hours
      expect(notification.scheduledFor.getHours()).toBeGreaterThanOrEqual(8);
    });
  });

  describe('sendNotification', () => {
    it('should send email notification successfully', async () => {
      emailService.sendEmail.mockResolvedValue({
        success: true,
        messageId: 'test-message-id'
      });

      const notification = new Notification({
        type: 'task_due_soon',
        recipient: testUser._id,
        title: 'Task due soon',
        message: 'Your task is due soon',
        relatedTask: testTask._id,
        channels: ['email'],
        status: 'pending'
      });
      await notification.save();

      const result = await notificationService.sendNotification(notification._id);

      expect(result.success).toBe(true);
      expect(emailService.sendEmail).toHaveBeenCalledTimes(1);

      // Check notification status was updated
      const updatedNotification = await Notification.findById(notification._id);
      expect(updatedNotification.status).toBe('sent');
    });

    it('should handle email send failure', async () => {
      emailService.sendEmail.mockResolvedValue({
        success: false,
        error: 'Email send failed'
      });

      const notification = new Notification({
        type: 'task_due_soon',
        recipient: testUser._id,
        title: 'Task due soon',
        message: 'Your task is due soon',
        channels: ['email'],
        status: 'pending'
      });
      await notification.save();

      const result = await notificationService.sendNotification(notification._id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email send failed');

      // Check notification status was updated to failed
      const updatedNotification = await Notification.findById(notification._id);
      expect(updatedNotification.status).toBe('failed');
    });

    it('should send in-app notification when email channel not included', async () => {
      const notification = new Notification({
        type: 'task_assigned',
        recipient: testUser._id,
        title: 'New task assigned',
        message: 'A new task has been assigned to you',
        channels: ['in_app'],
        status: 'pending'
      });
      await notification.save();

      const result = await notificationService.sendNotification(notification._id);

      expect(result.success).toBe(true);
      expect(emailService.sendEmail).not.toHaveBeenCalled();

      // Check notification status was updated
      const updatedNotification = await Notification.findById(notification._id);
      expect(updatedNotification.status).toBe('delivered');
    });
  });

  describe('processScheduledNotifications', () => {
    it('should process pending notifications that are due', async () => {
      emailService.sendEmail.mockResolvedValue({
        success: true,
        messageId: 'test-message-id'
      });

      // Create past due notification
      const pastDue = new Date(Date.now() - 60 * 1000);
      const notification = new Notification({
        type: 'task_due_soon',
        recipient: testUser._id,
        title: 'Task due soon',
        message: 'Your task is due soon',
        scheduledFor: pastDue,
        channels: ['email'],
        status: 'pending'
      });
      await notification.save();

      const results = await notificationService.processScheduledNotifications();

      expect(results.processed).toBe(1);
      expect(results.successful).toBe(1);
      expect(results.failed).toBe(0);
      expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    });

    it('should not process future notifications', async () => {
      // Create future notification
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      const notification = new Notification({
        type: 'task_due_soon',
        recipient: testUser._id,
        title: 'Task due soon',
        message: 'Your task is due soon',
        scheduledFor: futureDate,
        channels: ['email'],
        status: 'pending'
      });
      await notification.save();

      const results = await notificationService.processScheduledNotifications();

      expect(results.processed).toBe(0);
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should handle mixed success and failure results', async () => {
      // Create two notifications - one will succeed, one will fail
      const pastDue = new Date(Date.now() - 60 * 1000);

      const notification1 = new Notification({
        type: 'task_due_soon',
        recipient: testUser._id,
        title: 'Task 1 due soon',
        message: 'Task 1 is due soon',
        scheduledFor: pastDue,
        channels: ['email'],
        status: 'pending'
      });
      await notification1.save();

      const notification2 = new Notification({
        type: 'task_due_soon',
        recipient: testUser._id,
        title: 'Task 2 due soon',
        message: 'Task 2 is due soon',
        scheduledFor: pastDue,
        channels: ['email'],
        status: 'pending'
      });
      await notification2.save();

      // Mock first call succeeds, second fails
      emailService.sendEmail
        .mockResolvedValueOnce({ success: true, messageId: 'test-id-1' })
        .mockResolvedValueOnce({ success: false, error: 'Send failed' });

      const results = await notificationService.processScheduledNotifications();

      expect(results.processed).toBe(2);
      expect(results.successful).toBe(1);
      expect(results.failed).toBe(1);
      expect(emailService.sendEmail).toHaveBeenCalledTimes(2);
    });
  });

  describe('getNotificationsForUser', () => {
    it('should retrieve user notifications with pagination', async () => {
      // Create multiple notifications for user
      const notifications = [];
      for (let i = 0; i < 5; i++) {
        const notification = new Notification({
          type: 'task_due_soon',
          recipient: testUser._id,
          title: `Task ${i + 1} due soon`,
          message: `Task ${i + 1} is due soon`,
          channels: ['in_app'],
          status: 'delivered'
        });
        await notification.save();
        notifications.push(notification);
      }

      const result = await notificationService.getNotificationsForUser(testUser._id, {
        page: 1,
        limit: 3
      });

      expect(result.data).toHaveLength(3);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pages).toBe(2);
    });

    it('should filter by unread notifications only', async () => {
      // Create read and unread notifications
      const readNotification = new Notification({
        type: 'task_assigned',
        recipient: testUser._id,
        title: 'Read notification',
        message: 'This has been read',
        channels: ['in_app'],
        status: 'delivered',
        read: true,
        readAt: new Date()
      });
      await readNotification.save();

      const unreadNotification = new Notification({
        type: 'task_due_soon',
        recipient: testUser._id,
        title: 'Unread notification',
        message: 'This has not been read',
        channels: ['in_app'],
        status: 'delivered',
        read: false
      });
      await unreadNotification.save();

      const result = await notificationService.getNotificationsForUser(testUser._id, {
        unreadOnly: true
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Unread notification');
      expect(result.data[0].read).toBe(false);
    });

    it('should filter by notification type', async () => {
      // Create notifications of different types
      const dueSoonNotification = new Notification({
        type: 'task_due_soon',
        recipient: testUser._id,
        title: 'Due soon notification',
        message: 'Task is due soon',
        channels: ['in_app'],
        status: 'delivered'
      });
      await dueSoonNotification.save();

      const assignedNotification = new Notification({
        type: 'task_assigned',
        recipient: testUser._id,
        title: 'Assigned notification',
        message: 'Task assigned',
        channels: ['in_app'],
        status: 'delivered'
      });
      await assignedNotification.save();

      const result = await notificationService.getNotificationsForUser(testUser._id, {
        type: 'task_assigned'
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('task_assigned');
      expect(result.data[0].title).toBe('Assigned notification');
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notification = new Notification({
        type: 'task_due_soon',
        recipient: testUser._id,
        title: 'Test notification',
        message: 'Test message',
        channels: ['in_app'],
        status: 'delivered',
        read: false
      });
      await notification.save();

      const result = await notificationService.markAsRead(notification._id, testUser._id);

      expect(result.success).toBe(true);
      expect(result.data.read).toBe(true);
      expect(result.data.readAt).toBeDefined();
    });

    it('should not allow marking another user\'s notification as read', async () => {
      const otherUser = new User({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'password123',
        role: 'user'
      });
      await otherUser.save();

      const notification = new Notification({
        type: 'task_due_soon',
        recipient: otherUser._id,
        title: 'Other user notification',
        message: 'Test message',
        channels: ['in_app'],
        status: 'delivered',
        read: false
      });
      await notification.save();

      const result = await notificationService.markAsRead(notification._id, testUser._id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Notification not found');
    });
  });

  describe('getUnreadCount', () => {
    it('should return correct unread count for user', async () => {
      // Create mix of read and unread notifications
      const readNotification = new Notification({
        type: 'task_assigned',
        recipient: testUser._id,
        title: 'Read notification',
        message: 'This has been read',
        channels: ['in_app'],
        status: 'delivered',
        read: true,
        readAt: new Date()
      });
      await readNotification.save();

      for (let i = 0; i < 3; i++) {
        const unreadNotification = new Notification({
          type: 'task_due_soon',
          recipient: testUser._id,
          title: `Unread notification ${i + 1}`,
          message: 'This has not been read',
          channels: ['in_app'],
          status: 'delivered',
          read: false
        });
        await unreadNotification.save();
      }

      const count = await notificationService.getUnreadCount(testUser._id);
      expect(count).toBe(3);
    });

    it('should return 0 when no unread notifications exist', async () => {
      const count = await notificationService.getUnreadCount(testUser._id);
      expect(count).toBe(0);
    });
  });
});