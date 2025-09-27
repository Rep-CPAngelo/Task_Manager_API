'use strict';

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');
const { notificationPreferenceSchema, testNotificationSchema } = require('../validations/notificationSchemas');

// Apply authentication to all notification routes
router.use(authMiddleware);

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Notification ID
 *         type:
 *           type: string
 *           enum: [task_due_soon, task_due_urgent, task_overdue, task_assigned, task_completed, task_updated, reminder_custom]
 *           description: Type of notification
 *         recipient:
 *           type: string
 *           description: User ID of the recipient
 *         title:
 *           type: string
 *           description: Notification title
 *         message:
 *           type: string
 *           description: Notification message
 *         relatedTask:
 *           type: string
 *           description: Related task ID
 *         scheduledFor:
 *           type: string
 *           format: date-time
 *           description: When the notification should be sent
 *         status:
 *           type: string
 *           enum: [pending, sent, delivered, failed, cancelled]
 *           description: Notification delivery status
 *         read:
 *           type: boolean
 *           description: Whether the notification has been read
 *         channels:
 *           type: array
 *           items:
 *             type: string
 *             enum: [email, in_app, push]
 *           description: Delivery channels
 *         createdAt:
 *           type: string
 *           format: date-time
 *         readAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *       example:
 *         _id: "60d5ec49f1b2c8b1f8e4e123"
 *         type: "task_due_soon"
 *         title: "Task 'Complete project' is due soon"
 *         message: "Your task 'Complete project' is due on 2023-06-25T10:00:00Z"
 *         status: "sent"
 *         read: false
 *         channels: ["email", "in_app"]
 *         createdAt: "2023-06-24T08:00:00Z"
 *
 *     NotificationPreferences:
 *       type: object
 *       properties:
 *         globalEnabled:
 *           type: boolean
 *           description: Global notification toggle
 *         channels:
 *           type: object
 *           properties:
 *             email:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *             inApp:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *             push:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *         preferences:
 *           type: object
 *           properties:
 *             taskDueSoon:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *                 advance:
 *                   type: number
 *                   description: Hours before due date
 *             taskDueUrgent:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *                 advance:
 *                   type: number
 *                   description: Hours before due date
 *         quietHours:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             start:
 *               type: string
 *               pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 *             end:
 *               type: string
 *               pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user notifications with pagination
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of notifications per page
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Only return unread notifications
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [task_due_soon, task_due_urgent, task_overdue, task_assigned, task_completed, task_updated, reminder_custom]
 *         description: Filter by notification type
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationInfo'
 */
router.get('/', notificationController.getNotifications);

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                 message:
 *                   type: string
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * @swagger
 * /api/notifications/preferences:
 *   get:
 *     summary: Get user notification preferences
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Notification preferences retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/NotificationPreferences'
 */
router.get('/preferences', notificationController.getPreferences);

/**
 * @swagger
 * /api/notifications/preferences:
 *   put:
 *     summary: Update user notification preferences
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationPreferences'
 *     responses:
 *       200:
 *         description: Notification preferences updated successfully
 *       400:
 *         description: Validation error
 */
router.put('/preferences', validate(notificationPreferenceSchema), notificationController.updatePreferences);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 */
router.patch('/:id/read', notificationController.markAsRead);

/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     modifiedCount:
 *                       type: integer
 */
router.patch('/mark-all-read', notificationController.markAllAsRead);

/**
 * @swagger
 * /api/notifications/test:
 *   post:
 *     summary: Send test notification (Admin only)
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - recipient
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [task_due_soon, task_due_urgent, task_overdue, task_assigned, task_completed, task_updated, reminder_custom]
 *               recipient:
 *                 type: string
 *                 description: User ID
 *               testData:
 *                 type: object
 *                 description: Additional test data
 *     responses:
 *       200:
 *         description: Test notification sent
 *       403:
 *         description: Admin access required
 */
router.post('/test', validate(testNotificationSchema), notificationController.testNotification);

/**
 * @swagger
 * /api/notifications/stats:
 *   get:
 *     summary: Get notification statistics (Admin only)
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics (default: 7 days ago)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics (default: today)
 *     responses:
 *       200:
 *         description: Notification statistics retrieved
 *       403:
 *         description: Admin access required
 */
router.get('/stats', notificationController.getStats);

/**
 * @swagger
 * /api/notifications/process:
 *   post:
 *     summary: Manually trigger notification processing (Admin only)
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Notification processing completed
 *       403:
 *         description: Admin access required
 */
router.post('/process', notificationController.processNotifications);

module.exports = router;