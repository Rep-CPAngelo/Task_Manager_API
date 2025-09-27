'use strict';

const recurringTaskService = require('./recurringTaskService');
const notificationService = require('./notificationService');

class CronService {
  constructor() {
    this.intervals = new Map();
    this.isRunning = false;
  }

  /**
   * Start the cron service
   */
  start() {
    if (this.isRunning) {
      console.log('Cron service is already running');
      return;
    }

    console.log('Starting cron service...');
    this.isRunning = true;

    // Generate recurring tasks every 5 minutes
    this.scheduleRecurringTaskGeneration();

    // Process notifications every 2 minutes
    this.scheduleNotificationProcessing();

    // Check for overdue tasks every hour
    this.scheduleOverdueCheck();

    // Cleanup old notifications daily
    this.scheduleNotificationCleanup();

    console.log('Cron service started successfully with notification processing');
  }

  /**
   * Stop the cron service
   */
  stop() {
    if (!this.isRunning) {
      console.log('Cron service is not running');
      return;
    }

    console.log('Stopping cron service...');

    // Clear all intervals
    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.intervals.clear();

    this.isRunning = false;
    console.log('Cron service stopped');
  }

  /**
   * Schedule recurring task generation
   */
  scheduleRecurringTaskGeneration() {
    const generateTasks = async () => {
      try {
        console.log('Running recurring task generation...');
        const createdTasks = await recurringTaskService.generateDueRecurringTasks();

        if (createdTasks.length > 0) {
          console.log(`Generated ${createdTasks.length} recurring task instances`);
        }
      } catch (error) {
        console.error('Error in recurring task generation:', error);
      }
    };

    // Run immediately on startup
    generateTasks();

    // Then run every 5 minutes (300,000 milliseconds)
    const interval = setInterval(generateTasks, 5 * 60 * 1000);
    this.intervals.set('recurringTasks', interval);
  }

  /**
   * Schedule notification processing
   */
  scheduleNotificationProcessing() {
    const processNotifications = async () => {
      try {
        const results = await notificationService.processPendingNotifications();
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;

        if (results.length > 0) {
          console.log(`📧 Processed ${results.length} notifications (${successCount} sent, ${failureCount} failed)`);
        }
      } catch (error) {
        console.error('Error processing notifications:', error);
      }
    };

    // Run every 2 minutes
    const interval = setInterval(processNotifications, 2 * 60 * 1000);
    this.intervals.set('notifications', interval);
  }

  /**
   * Schedule overdue task checking
   */
  scheduleOverdueCheck() {
    const checkOverdue = async () => {
      try {
        const overdueNotifications = await notificationService.scheduleOverdueNotifications();
        if (overdueNotifications.length > 0) {
          console.log(`⚠️ Scheduled ${overdueNotifications.length} overdue notifications`);
        }
      } catch (error) {
        console.error('Error checking overdue tasks:', error);
      }
    };

    // Run every hour
    const interval = setInterval(checkOverdue, 60 * 60 * 1000);
    this.intervals.set('overdueCheck', interval);
  }

  /**
   * Schedule notification cleanup
   */
  scheduleNotificationCleanup() {
    const cleanup = async () => {
      try {
        const now = new Date();
        // Run cleanup at 2 AM
        if (now.getHours() === 2) {
          const result = await notificationService.cleanupOldNotifications(30);
          console.log(`🗑️ Notification cleanup completed: ${result.deletedCount} removed`);
        }
      } catch (error) {
        console.error('Error during notification cleanup:', error);
      }
    };

    // Check every hour, run cleanup at 2 AM
    const interval = setInterval(cleanup, 60 * 60 * 1000);
    this.intervals.set('notificationCleanup', interval);
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.intervals.keys()),
      startedAt: this.startedAt
    };
  }
}

module.exports = new CronService();