'use strict';

const Task = require('../models/Task');

class RecurringTaskService {
  /**
   * Calculate the next due date for a recurring task
   * @param {Object} recurrence - Recurrence configuration
   * @param {Date} currentDueDate - Current due date
   * @returns {Date|null} Next due date or null if no more occurrences
   */
  calculateNextDueDate(recurrence, currentDueDate) {
    if (!recurrence.frequency || !currentDueDate) return null;

    const nextDate = new Date(currentDueDate);

    switch (recurrence.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + (recurrence.interval || 1));
        break;

      case 'weekly':
        nextDate.setDate(nextDate.getDate() + (7 * (recurrence.interval || 1)));
        break;

      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + (recurrence.interval || 1));
        // Handle day of month for monthly recurrence
        if (recurrence.dayOfMonth && recurrence.dayOfMonth <= 31) {
          nextDate.setDate(recurrence.dayOfMonth);
        }
        break;

      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + (recurrence.interval || 1));
        break;

      default:
        return null;
    }

    // Check if we've exceeded the end date or max occurrences
    if (recurrence.endDate && nextDate > recurrence.endDate) {
      return null;
    }

    return nextDate;
  }

  /**
   * Create a new task instance from a recurring task
   * @param {Object} parentTask - The original recurring task
   * @param {Date} dueDate - Due date for the new instance
   * @returns {Object} New task data
   */
  createTaskInstance(parentTask, dueDate) {
    const taskData = {
      title: parentTask.title,
      description: parentTask.description,
      priority: parentTask.priority,
      dueDate: dueDate,
      assignedTo: parentTask.assignedTo,
      createdBy: parentTask.createdBy,
      labels: [...parentTask.labels],
      subtasks: parentTask.subtasks.map(subtask => ({
        title: subtask.title,
        status: 'pending'
      })),
      attachments: [...parentTask.attachments],
      parentTask: parentTask._id,
      isRecurring: false, // Instance is not recurring itself
      status: 'pending'
    };

    return taskData;
  }

  /**
   * Generate due recurring task instances
   * @returns {Array} Array of created task instances
   */
  async generateDueRecurringTasks() {
    const now = new Date();
    const createdTasks = [];

    // Find all recurring tasks where nextDueDate is due or overdue
    const recurringTasks = await Task.find({
      isRecurring: true,
      isDeleted: false,
      nextDueDate: { $lte: now },
      $or: [
        { 'recurrence.endDate': { $gte: now } },
        { 'recurrence.endDate': null },
        { 'recurrence.maxOccurrences': null },
        { $expr: { $gt: ['$recurrence.maxOccurrences', '$occurrenceCount'] } }
      ]
    });

    for (const recurringTask of recurringTasks) {
      try {
        // Create new task instance
        const taskData = this.createTaskInstance(recurringTask, recurringTask.nextDueDate);
        const newTask = await Task.create(taskData);
        createdTasks.push(newTask);

        // Calculate next due date
        const nextDueDate = this.calculateNextDueDate(
          recurringTask.recurrence,
          recurringTask.nextDueDate
        );

        // Update the recurring task
        const updateData = {
          occurrenceCount: recurringTask.occurrenceCount + 1
        };

        if (nextDueDate) {
          updateData.nextDueDate = nextDueDate;
        } else {
          // No more occurrences - mark as completed or inactive
          updateData.nextDueDate = null;
          updateData.status = 'completed';
        }

        await Task.findByIdAndUpdate(recurringTask._id, updateData);

      } catch (error) {
        console.error(`Error creating recurring task instance for ${recurringTask._id}:`, error);
      }
    }

    return createdTasks;
  }

  /**
   * Set up a recurring task
   * @param {Object} taskData - Task data including recurrence config
   * @returns {Object} Created recurring task
   */
  async createRecurringTask(taskData) {
    if (!taskData.isRecurring || !taskData.recurrence.frequency) {
      throw new Error('Invalid recurrence configuration');
    }

    // Set initial nextDueDate
    if (!taskData.nextDueDate && taskData.dueDate) {
      taskData.nextDueDate = taskData.dueDate;
    }

    // Create the recurring task
    const recurringTask = await Task.create(taskData);
    return recurringTask;
  }

  /**
   * Update a recurring task's recurrence settings
   * @param {String} taskId - Task ID
   * @param {Object} recurrenceUpdate - New recurrence settings
   * @returns {Object} Updated task
   */
  async updateRecurringTask(taskId, recurrenceUpdate) {
    const task = await Task.findById(taskId);

    if (!task || !task.isRecurring) {
      throw new Error('Task not found or not recurring');
    }

    // Update recurrence settings
    const updateData = {
      recurrence: { ...task.recurrence.toObject(), ...recurrenceUpdate }
    };

    // Recalculate next due date if frequency or interval changed
    if (recurrenceUpdate.frequency || recurrenceUpdate.interval) {
      const nextDueDate = this.calculateNextDueDate(updateData.recurrence, task.nextDueDate);
      updateData.nextDueDate = nextDueDate;
    }

    const updatedTask = await Task.findByIdAndUpdate(taskId, updateData, { new: true });
    return updatedTask;
  }

  /**
   * Get all instances of a recurring task
   * @param {String} parentTaskId - Parent task ID
   * @param {Object} options - Query options (pagination, etc.)
   * @returns {Object} Paginated task instances
   */
  async getTaskInstances(parentTaskId, options = {}) {
    const { page = 1, limit = 10, sort = '-createdAt' } = options;
    const skip = (page - 1) * limit;

    const instances = await Task.find({
      parentTask: parentTaskId,
      isDeleted: false
    })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email');

    const total = await Task.countDocuments({
      parentTask: parentTaskId,
      isDeleted: false
    });

    return {
      instances,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    };
  }
}

module.exports = new RecurringTaskService();