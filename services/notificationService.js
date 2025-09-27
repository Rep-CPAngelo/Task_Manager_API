'use strict';

const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const Task = require('../models/Task');
const User = require('../models/User');
const emailService = require('./emailService');
const websocketService = require('./websocketService');

class NotificationService {
  /**
   * Create a new notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Created notification
   */
  async createNotification(notificationData) {
    const notification = new Notification(notificationData);
    await notification.save();

    // Emit real-time notification if it's for immediate delivery
    if (!notificationData.scheduledFor || new Date(notificationData.scheduledFor) <= new Date()) {
      try {
        websocketService.emitNotification(notificationData.recipient, {
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          relatedTask: notification.relatedTask,
          relatedUser: notification.relatedUser,
          createdAt: notification.createdAt
        });
      } catch (error) {
        console.error('Failed to emit real-time notification:', error);
      }
    }

    return notification;
  }

  /**
   * Schedule a notification for future delivery
   * @param {Object} options - Notification options
   * @returns {Promise<Object>} Created notification
   */
  async scheduleNotification(options) {
    const {
      type,
      recipient,
      title,
      message,
      relatedTask,
      relatedUser,
      scheduledFor,
      channels = ['email', 'in_app'],
      metadata = {}
    } = options;

    // Check user preferences
    const preferences = await NotificationPreference.getOrCreatePreferences(recipient);

    if (!preferences.shouldNotify(type, 'email') && !preferences.shouldNotify(type, 'in_app')) {
      console.log(`Notification skipped for user ${recipient} - disabled in preferences`);
      return null;
    }

    // Filter channels based on user preferences
    const enabledChannels = channels.filter(channel =>
      preferences.shouldNotify(type, channel.replace('_', ''))
    );

    if (enabledChannels.length === 0) {
      console.log(`Notification skipped for user ${recipient} - no enabled channels`);
      return null;
    }

    // Check quiet hours
    if (preferences.isQuietTime(scheduledFor)) {
      // Schedule for after quiet hours end
      const newScheduledFor = this.calculateAfterQuietHours(scheduledFor, preferences);
      console.log(`Notification rescheduled due to quiet hours: ${scheduledFor} -> ${newScheduledFor}`);
      scheduledFor = newScheduledFor;
    }

    const notification = await this.createNotification({
      type,
      recipient,
      title,
      message,
      relatedTask,
      relatedUser,
      scheduledFor,
      channels: enabledChannels,
      metadata: new Map(Object.entries(metadata))
    });

    return notification;
  }

  /**
   * Process pending notifications
   * @returns {Promise<Array>} Processing results
   */
  async processPendingNotifications() {
    const pendingNotifications = await Notification.getPendingNotifications();
    const results = [];

    console.log(`Processing ${pendingNotifications.length} pending notifications`);

    for (const notification of pendingNotifications) {
      try {
        const result = await this.deliverNotification(notification);
        results.push(result);
      } catch (error) {
        console.error(`Failed to deliver notification ${notification._id}:`, error);
        await notification.markAsFailed(error.message);
        results.push({
          notificationId: notification._id,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Deliver a single notification
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} Delivery result
   */
  async deliverNotification(notification) {
    const results = {
      notificationId: notification._id,
      channels: {},
      success: false
    };

    // Process each channel
    for (const channel of notification.channels) {
      try {
        let channelResult;

        switch (channel) {
          case 'email':
            channelResult = await this.sendEmailNotification(notification);
            break;
          case 'in_app':
            channelResult = await this.createInAppNotification(notification);
            break;
          case 'push':
            channelResult = await this.sendPushNotification(notification);
            break;
          default:
            channelResult = { success: false, error: `Unknown channel: ${channel}` };
        }

        results.channels[channel] = channelResult;

        if (channelResult.success) {
          results.success = true;
        }
      } catch (error) {
        console.error(`Failed to deliver notification via ${channel}:`, error);
        results.channels[channel] = { success: false, error: error.message };
      }
    }

    // Update notification status
    if (results.success) {
      await notification.markAsSent();

      // Emit real-time notification via WebSocket
      try {
        websocketService.emitNotification(notification.recipient, {
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          relatedTask: notification.relatedTask,
          relatedUser: notification.relatedUser,
          createdAt: notification.createdAt,
          deliveredAt: new Date()
        });
      } catch (error) {
        console.error('Failed to emit real-time notification:', error);
      }
    } else {
      const errors = Object.values(results.channels)
        .filter(r => !r.success)
        .map(r => r.error)
        .join('; ');
      await notification.markAsFailed(errors);
    }

    return results;
  }

  /**
   * Send email notification
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} Email result
   */
  async sendEmailNotification(notification) {
    const user = notification.recipient;
    const task = notification.relatedTask;

    // Prepare template data
    const templateData = {
      userName: user.name,
      taskTitle: task?.title || 'Unknown Task',
      taskDescription: task?.description,
      dueDate: task?.dueDate ? new Date(task.dueDate).toLocaleString() : 'No due date',
      priority: task?.priority || 'medium',
      assignedBy: notification.relatedUser?.name || 'System'
    };

    const emailOptions = {
      to: user.email,
      template: notification.type,
      templateData
    };

    const result = await emailService.sendEmail(emailOptions);

    if (result.success) {
      notification.emailSent = true;
      await notification.save();
    }

    return result;
  }

  /**
   * Create in-app notification (mark as delivered immediately)
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} Result
   */
  async createInAppNotification(notification) {
    // In-app notifications are stored in the database and retrieved by the client
    // No additional processing needed - just mark as delivered
    return { success: true, messageId: `in_app_${notification._id}` };
  }

  /**
   * Send push notification (placeholder)
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} Result
   */
  async sendPushNotification(notification) {
    // Push notifications would be implemented here (e.g., using FCM, APNS, etc.)
    console.log(`Push notification would be sent: ${notification.title}`);
    return { success: true, messageId: `push_${notification._id}` };
  }

  /**
   * Schedule task due notifications
   * @param {Object} task - Task object
   * @returns {Promise<Array>} Scheduled notifications
   */
  async scheduleTaskDueNotifications(task) {
    if (!task.dueDate || !task.assignedTo) {
      return [];
    }

    const notifications = [];
    const dueDate = new Date(task.dueDate);
    const now = new Date();

    // Get user preferences to determine notification timing
    const preferences = await NotificationPreference.getOrCreatePreferences(task.assignedTo);

    // Schedule "due soon" notification
    const dueSoonHours = preferences.preferences.taskDueSoon.advance || 24;
    const dueSoonDate = new Date(dueDate.getTime() - (dueSoonHours * 60 * 60 * 1000));

    if (dueSoonDate > now) {
      const dueSoonNotification = await this.scheduleNotification({
        type: 'task_due_soon',
        recipient: task.assignedTo,
        title: `Task "${task.title}" is due soon`,
        message: `Your task "${task.title}" is due on ${dueDate.toLocaleString()}`,
        relatedTask: task._id,
        scheduledFor: dueSoonDate
      });

      if (dueSoonNotification) {
        notifications.push(dueSoonNotification);
      }
    }

    // Schedule urgent notification
    const urgentHours = preferences.preferences.taskDueUrgent.advance || 1;
    const urgentDate = new Date(dueDate.getTime() - (urgentHours * 60 * 60 * 1000));

    if (urgentDate > now) {
      const urgentNotification = await this.scheduleNotification({
        type: 'task_due_urgent',
        recipient: task.assignedTo,
        title: `URGENT: Task "${task.title}" is due in ${urgentHours} hour(s)!`,
        message: `Your task "${task.title}" is due in ${urgentHours} hour(s). Please complete it immediately.`,
        relatedTask: task._id,
        scheduledFor: urgentDate
      });

      if (urgentNotification) {
        notifications.push(urgentNotification);
      }
    }

    return notifications;
  }

  /**
   * Handle task assignment notification
   * @param {Object} task - Task object
   * @param {String} assignedBy - User ID who assigned the task
   * @returns {Promise<Object>} Notification
   */
  async notifyTaskAssigned(task, assignedBy) {
    if (!task.assignedTo || task.assignedTo === assignedBy) {
      return null;
    }

    return await this.scheduleNotification({
      type: 'task_assigned',
      recipient: task.assignedTo,
      title: `New task assigned: "${task.title}"`,
      message: `A new task "${task.title}" has been assigned to you.`,
      relatedTask: task._id,
      relatedUser: assignedBy,
      scheduledFor: new Date() // Send immediately
    });
  }

  /**
   * Check and schedule overdue notifications
   * @returns {Promise<Array>} Scheduled notifications
   */
  async scheduleOverdueNotifications() {
    const overdueTasks = await Task.find({
      dueDate: { $lt: new Date() },
      status: { $ne: 'completed' },
      isDeleted: false,
      assignedTo: { $exists: true, $ne: null }
    }).populate('assignedTo');

    const notifications = [];

    for (const task of overdueTasks) {
      // Check if we already sent an overdue notification today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingNotification = await Notification.findOne({
        type: 'task_overdue',
        relatedTask: task._id,
        createdAt: { $gte: today }
      });

      if (!existingNotification) {
        const notification = await this.scheduleNotification({
          type: 'task_overdue',
          recipient: task.assignedTo._id,
          title: `Task "${task.title}" is overdue`,
          message: `Your task "${task.title}" was due on ${new Date(task.dueDate).toLocaleString()} and is now overdue.`,
          relatedTask: task._id,
          scheduledFor: new Date()
        });

        if (notification) {
          notifications.push(notification);
        }
      }
    }

    return notifications;
  }

  /**
   * Get user notifications with pagination
   * @param {String} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated notifications
   */
  async getUserNotifications(userId, options = {}) {
    return await Notification.getUserNotifications(userId, options);
  }

  /**
   * Get unread notification count
   * @param {String} userId - User ID
   * @returns {Promise<Number>} Unread count
   */
  async getUnreadCount(userId) {
    return await Notification.getUnreadCount(userId);
  }

  /**
   * Mark notification as read
   * @param {String} notificationId - Notification ID
   * @param {String} userId - User ID (for security)
   * @returns {Promise<Object>} Updated notification
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      throw new Error('Notification not found or access denied');
    }

    return await notification.markAsRead();
  }

  /**
   * Mark all notifications as read for a user
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Update result
   */
  async markAllAsRead(userId) {
    return await Notification.updateMany(
      { recipient: userId, read: false },
      { read: true, readAt: new Date() }
    );
  }

  /**
   * Calculate time after quiet hours end
   * @param {Date} originalTime - Original scheduled time
   * @param {Object} preferences - User preferences
   * @returns {Date} Adjusted time
   */
  calculateAfterQuietHours(originalTime, preferences) {
    if (!preferences.quietHours.enabled) {
      return originalTime;
    }

    const endTime = preferences.quietHours.end;
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const adjustedDate = new Date(originalTime);
    adjustedDate.setHours(endHour, endMinute, 0, 0);

    // If the end time is earlier than the original time (overnight quiet hours),
    // schedule for the next day
    if (adjustedDate <= originalTime) {
      adjustedDate.setDate(adjustedDate.getDate() + 1);
    }

    return adjustedDate;
  }

  /**
   * Clean up old notifications
   * @param {Number} daysOld - Number of days to keep
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOldNotifications(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoffDate },
      status: { $in: ['delivered', 'failed'] }
    });

    console.log(`Cleaned up ${result.deletedCount} old notifications`);
    return result;
  }
}

module.exports = new NotificationService();