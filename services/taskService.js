'use strict';

const Task = require('../models/Task');
const TaskActivity = require('../models/TaskActivity');
const notificationService = require('./notificationService');

class TaskService {
  /**
   * Create a new task
   * @param {Object} taskData - Task data
   * @returns {Object} Created task
   */
  async createTask(taskData) {
    const task = await Task.create(taskData);
    await this.createActivity(task._id, taskData.createdBy, 'task_created', { title: task.title });

    // Schedule due date notifications if task has due date and assignee
    if (task.dueDate && task.assignedTo) {
      try {
        await notificationService.scheduleTaskDueNotifications(task);
      } catch (error) {
        console.error('Failed to schedule task due notifications:', error);
      }

      // Send task assignment notification if assigned to someone other than creator
      if (task.assignedTo !== task.createdBy) {
        try {
          await notificationService.notifyTaskAssigned(task, task.createdBy);
        } catch (error) {
          console.error('Failed to send task assignment notification:', error);
        }
      }
    }

    return task;
  }

  /**
   * Get tasks with filters and pagination
   * @param {Object} filters - Query filters
   * @param {Object} options - Pagination and sorting options
   * @returns {Object} Tasks and pagination info
   */
  async getTasks(filters, options) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder.toLowerCase() === 'asc' ? 1 : -1 };

    const [tasks, total] = await Promise.all([
      Task.find(filters)
        .skip(skip)
        .limit(parseInt(limit))
        .sort(sort)
        .populate('assignedTo', 'name email role')
        .populate('createdBy', 'name email role')
        .lean(),
      Task.countDocuments(filters)
    ]);

    return {
      tasks,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    };
  }

  /**
   * Get task by ID
   * @param {String} taskId - Task ID
   * @returns {Object} Task or null
   */
  async getTaskById(taskId) {
    return await Task.findById(taskId)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role');
  }

  /**
   * Update task
   * @param {String} taskId - Task ID
   * @param {Object} updates - Updates to apply
   * @param {String} userId - User making the update
   * @returns {Object} Updated task
   */
  async updateTask(taskId, updates, userId) {
    const task = await Task.findById(taskId);
    if (!task || task.isDeleted) {
      throw new Error('Task not found');
    }

    const before = { status: task.status, priority: task.priority, assignedTo: task.assignedTo, dueDate: task.dueDate };
    Object.assign(task, updates);
    await task.save();
    await this.createActivity(task._id, userId, 'task_updated', { before, updates });

    // Handle assignment changes
    if (updates.assignedTo && updates.assignedTo !== before.assignedTo) {
      try {
        await notificationService.notifyTaskAssigned(task, userId);
      } catch (error) {
        console.error('Failed to send task assignment notification:', error);
      }
    }

    // Reschedule due date notifications if due date changed
    if (updates.dueDate && task.assignedTo) {
      try {
        // Cancel existing notifications for this task
        await this.cancelTaskNotifications(taskId);
        // Schedule new notifications
        await notificationService.scheduleTaskDueNotifications(task);
      } catch (error) {
        console.error('Failed to reschedule task due notifications:', error);
      }
    }

    return task;
  }

  /**
   * Update task status
   * @param {String} taskId - Task ID
   * @param {String} status - New status
   * @param {String} userId - User making the update
   * @returns {Object} Updated task
   */
  async updateTaskStatus(taskId, status, userId) {
    const task = await Task.findById(taskId);
    if (!task || task.isDeleted) {
      throw new Error('Task not found');
    }

    const from = task.status;
    task.status = status;
    await task.save();
    await this.createActivity(task._id, userId, 'task_status_updated', { from, to: status });

    // Send completion notification if task is completed
    if (status === 'completed' && task.createdBy !== userId && task.createdBy) {
      try {
        await notificationService.scheduleNotification({
          type: 'task_completed',
          recipient: task.createdBy,
          title: `Task "${task.title}" has been completed`,
          message: `Task "${task.title}" has been marked as completed.`,
          relatedTask: task._id,
          relatedUser: userId,
          scheduledFor: new Date()
        });
      } catch (error) {
        console.error('Failed to send task completion notification:', error);
      }

      // Cancel due date notifications since task is completed
      try {
        await this.cancelTaskNotifications(taskId);
      } catch (error) {
        console.error('Failed to cancel task notifications:', error);
      }
    }

    return task;
  }

  /**
   * Soft delete task
   * @param {String} taskId - Task ID
   * @param {String} userId - User deleting the task
   * @returns {Object} Updated task
   */
  async deleteTask(taskId, userId) {
    const task = await Task.findById(taskId);
    if (!task || task.isDeleted) {
      throw new Error('Task not found');
    }

    task.isDeleted = true;
    task.deletedAt = new Date();
    task.deletedBy = userId;
    await task.save();
    await this.createActivity(task._id, userId, 'task_deleted');

    return task;
  }

  /**
   * Add comment to task
   * @param {String} taskId - Task ID
   * @param {String} text - Comment text
   * @param {String} userId - User adding comment
   * @returns {Object} Updated task
   */
  async addComment(taskId, text, userId) {
    const task = await Task.findById(taskId);
    if (!task || task.isDeleted) {
      throw new Error('Task not found');
    }

    const comment = { user: userId, text, createdAt: new Date() };
    task.comments.push(comment);
    await task.save();
    await this.createActivity(task._id, userId, 'comment_added', { text });

    return task;
  }

  /**
   * Add attachment to task
   * @param {String} taskId - Task ID
   * @param {String} url - Attachment URL
   * @param {String} userId - User adding attachment
   * @returns {Object} Updated task
   */
  async addAttachment(taskId, url, userId) {
    const task = await Task.findById(taskId);
    if (!task || task.isDeleted) {
      throw new Error('Task not found');
    }

    task.attachments.push(url);
    await task.save();
    await this.createActivity(task._id, userId, 'attachment_added', { url });

    return task;
  }

  /**
   * Add subtask to task
   * @param {String} taskId - Task ID
   * @param {String} title - Subtask title
   * @param {String} userId - User adding subtask
   * @returns {Object} Updated task
   */
  async addSubtask(taskId, title, userId) {
    const task = await Task.findById(taskId);
    if (!task || task.isDeleted) {
      throw new Error('Task not found');
    }

    task.subtasks.push({ title, status: 'pending' });
    await task.save();
    await this.createActivity(task._id, userId, 'subtask_added', { title });

    return task;
  }

  /**
   * Update subtask
   * @param {String} taskId - Task ID
   * @param {String} subtaskId - Subtask ID
   * @param {Object} updates - Updates to apply
   * @param {String} userId - User making update
   * @returns {Object} Updated task
   */
  async updateSubtask(taskId, subtaskId, updates, userId) {
    const task = await Task.findById(taskId);
    if (!task || task.isDeleted) {
      throw new Error('Task not found');
    }

    const subtask = task.subtasks.id(subtaskId);
    if (!subtask) {
      throw new Error('Subtask not found');
    }

    Object.assign(subtask, updates);
    await task.save();
    await this.createActivity(task._id, userId, 'subtask_updated', { subId: subtaskId, updates });

    return task;
  }

  /**
   * Get task activity
   * @param {String} taskId - Task ID
   * @param {Object} options - Pagination options
   * @returns {Object} Activity items and pagination info
   */
  async getTaskActivity(taskId, options) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      TaskActivity.find({ task: taskId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      TaskActivity.countDocuments({ task: taskId })
    ]);

    return {
      items,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    };
  }

  /**
   * Create task activity record
   * @param {String} taskId - Task ID
   * @param {String} userId - User ID
   * @param {String} action - Action type
   * @param {Object} details - Action details
   */
  async createActivity(taskId, userId, action, details = {}) {
    await TaskActivity.create({ task: taskId, user: userId, action, details });
  }

  /**
   * Build filter object for task queries
   * @param {Object} query - Query parameters
   * @param {Object} user - User object
   * @returns {Object} Filter object
   */
  buildTaskFilter(query, user) {
    const { status, priority, assignedTo, createdBy, dueFrom, dueTo, q } = query;

    const filter = { isDeleted: false };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (createdBy) filter.createdBy = createdBy;

    if (dueFrom || dueTo) {
      filter.dueDate = {};
      if (dueFrom) filter.dueDate.$gte = new Date(dueFrom);
      if (dueTo) filter.dueDate.$lte = new Date(dueTo);
    }

    if (q) {
      filter.$text = { $search: q };
    }

    // Non-admins can only see tasks they created or are assigned to
    if (user.role !== 'admin') {
      filter.$or = [
        { createdBy: user.id },
        { assignedTo: user.id }
      ];
    }

    return filter;
  }

  /**
   * Check if user has permission to access task
   * @param {Object} task - Task object
   * @param {Object} user - User object
   * @param {Boolean} requireOwner - If true, requires user to be owner
   * @returns {Boolean} Has permission
   */
  hasTaskPermission(task, user, requireOwner = false) {
    if (user.role === 'admin') return true;

    const isOwner = String(task.createdBy._id || task.createdBy) === String(user.id);
    const isAssignee = String(task.assignedTo) === String(user.id);

    if (requireOwner) return isOwner;
    return isOwner || isAssignee;
  }

  /**
   * Cancel pending notifications for a task
   * @param {String} taskId - Task ID
   * @returns {Promise} Cancellation result
   */
  async cancelTaskNotifications(taskId) {
    const Notification = require('../models/Notification');

    return await Notification.updateMany(
      {
        relatedTask: taskId,
        status: 'pending',
        type: { $in: ['task_due_soon', 'task_due_urgent'] }
      },
      {
        status: 'cancelled',
        metadata: { cancelledAt: new Date(), reason: 'task_updated' }
      }
    );
  }
}

module.exports = new TaskService();