'use strict';

const notificationService = require('../services/notificationService');
const NotificationPreference = require('../models/NotificationPreference');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

class NotificationController {
  /**
   * Get user notifications with pagination
   */
  async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 20,
        unreadOnly = false,
        type = null
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        unreadOnly: unreadOnly === 'true',
        type
      };

      const result = await notificationService.getUserNotifications(userId, options);

      return paginatedResponse(
        res,
        result.notifications,
        result.pagination.current,
        result.pagination.limit,
        result.pagination.total
      );
    } catch (error) {
      console.error('Get notifications error:', error);
      return errorResponse(res, 'Failed to fetch notifications', 500);
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      const count = await notificationService.getUnreadCount(userId);

      return successResponse(res, { count }, 'Unread count retrieved successfully');
    } catch (error) {
      console.error('Get unread count error:', error);
      return errorResponse(res, 'Failed to fetch unread count', 500);
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const notification = await notificationService.markAsRead(id, userId);

      return successResponse(res, notification, 'Notification marked as read');
    } catch (error) {
      console.error('Mark as read error:', error);
      if (error.message === 'Notification not found or access denied') {
        return errorResponse(res, error.message, 404);
      }
      return errorResponse(res, 'Failed to mark notification as read', 500);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      const result = await notificationService.markAllAsRead(userId);

      return successResponse(
        res,
        { modifiedCount: result.modifiedCount },
        'All notifications marked as read'
      );
    } catch (error) {
      console.error('Mark all as read error:', error);
      return errorResponse(res, 'Failed to mark all notifications as read', 500);
    }
  }

  /**
   * Get user notification preferences
   */
  async getPreferences(req, res) {
    try {
      const userId = req.user.id;
      const preferences = await NotificationPreference.getOrCreatePreferences(userId);

      return successResponse(res, preferences, 'Notification preferences retrieved successfully');
    } catch (error) {
      console.error('Get preferences error:', error);
      return errorResponse(res, 'Failed to fetch notification preferences', 500);
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(req, res) {
    try {
      const userId = req.user.id;
      const updates = req.body;

      let preferences = await NotificationPreference.findOne({ user: userId });

      if (!preferences) {
        preferences = new NotificationPreference({ user: userId });
      }

      // Update preferences
      if (updates.globalEnabled !== undefined) {
        preferences.globalEnabled = updates.globalEnabled;
      }

      if (updates.channels) {
        Object.keys(updates.channels).forEach(channel => {
          if (preferences.channels[channel]) {
            Object.assign(preferences.channels[channel], updates.channels[channel]);
          }
        });
      }

      if (updates.preferences) {
        Object.keys(updates.preferences).forEach(prefType => {
          if (preferences.preferences[prefType]) {
            Object.assign(preferences.preferences[prefType], updates.preferences[prefType]);
          }
        });
      }

      if (updates.quietHours) {
        Object.assign(preferences.quietHours, updates.quietHours);
      }

      if (updates.digest) {
        Object.assign(preferences.digest, updates.digest);
      }

      await preferences.save();

      return successResponse(res, preferences, 'Notification preferences updated successfully');
    } catch (error) {
      console.error('Update preferences error:', error);
      if (error.name === 'ValidationError') {
        return errorResponse(res, error.message, 400);
      }
      return errorResponse(res, 'Failed to update notification preferences', 500);
    }
  }

  /**
   * Test notification sending (for development/admin)
   */
  async testNotification(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return errorResponse(res, 'Admin access required', 403);
      }

      const { type, recipient, testData } = req.body;

      if (!type || !recipient) {
        return errorResponse(res, 'Type and recipient are required', 400);
      }

      // Create a test notification
      const notification = await notificationService.scheduleNotification({
        type,
        recipient,
        title: `Test Notification: ${type}`,
        message: `This is a test notification of type ${type}`,
        scheduledFor: new Date(),
        metadata: { test: true, ...testData }
      });

      if (!notification) {
        return successResponse(res, null, 'Notification not sent due to user preferences');
      }

      // Process immediately for testing
      const result = await notificationService.deliverNotification(notification);

      return successResponse(res, {
        notification,
        deliveryResult: result
      }, 'Test notification sent');
    } catch (error) {
      console.error('Test notification error:', error);
      return errorResponse(res, 'Failed to send test notification', 500);
    }
  }

  /**
   * Get notification statistics (admin only)
   */
  async getStats(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return errorResponse(res, 'Admin access required', 403);
      }

      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const end = endDate ? new Date(endDate) : new Date();

      const Notification = require('../models/Notification');

      const stats = await Promise.all([
        // Total notifications by status
        Notification.aggregate([
          {
            $match: {
              createdAt: { $gte: start, $lte: end }
            }
          },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]),

        // Notifications by type
        Notification.aggregate([
          {
            $match: {
              createdAt: { $gte: start, $lte: end }
            }
          },
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 }
            }
          }
        ]),

        // Daily notification volume
        Notification.aggregate([
          {
            $match: {
              createdAt: { $gte: start, $lte: end }
            }
          },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' }
              },
              count: { $sum: 1 }
            }
          },
          {
            $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
          }
        ]),

        // Total counts
        Notification.countDocuments({ createdAt: { $gte: start, $lte: end } })
      ]);

      return successResponse(res, {
        period: { start, end },
        statusBreakdown: stats[0],
        typeBreakdown: stats[1],
        dailyVolume: stats[2],
        totalNotifications: stats[3]
      }, 'Notification statistics retrieved successfully');
    } catch (error) {
      console.error('Get notification stats error:', error);
      return errorResponse(res, 'Failed to fetch notification statistics', 500);
    }
  }

  /**
   * Manually trigger notification processing (admin only)
   */
  async processNotifications(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return errorResponse(res, 'Admin access required', 403);
      }

      const results = await notificationService.processPendingNotifications();
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      return successResponse(res, {
        processed: results.length,
        successful: successCount,
        failed: failureCount,
        details: results
      }, 'Notification processing completed');
    } catch (error) {
      console.error('Process notifications error:', error);
      return errorResponse(res, 'Failed to process notifications', 500);
    }
  }
}

module.exports = new NotificationController();