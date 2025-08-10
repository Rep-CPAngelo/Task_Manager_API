'use strict';

const Task = require('../models/Task');
const TaskActivity = require('../models/TaskActivity');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

class TaskController {
  async createTask (req, res) {
    try {
      const { title, description, status, priority, dueDate, assignedTo, labels, subtasks, attachments } = req.body;
      const task = await Task.create({
        title,
        description,
        status,
        priority,
        dueDate,
        assignedTo: assignedTo || null,
        labels: labels || [],
        subtasks: subtasks || [],
        attachments: attachments || [],
        createdBy: req.user.id
      });
      await TaskActivity.create({ task: task._id, user: req.user.id, action: 'task_created', details: { title } });
      return successResponse(res, task, 'Task created successfully', 201);
    } catch (error) {
      console.error('Create task error:', error);
      return errorResponse(res, 'Failed to create task', 500);
    }
  }

  async getTasks (req, res) {
    try {
      const { page = 1, limit = 10, status, priority, q, assignedTo, createdBy, dueFrom, dueTo, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

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
      if (req.user.role !== 'admin') {
        filter.$or = [
          { createdBy: req.user.id },
          { assignedTo: req.user.id }
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sort = { [sortBy]: sortOrder.toLowerCase() === 'asc' ? 1 : -1 };

      const [tasks, total] = await Promise.all([
        Task.find(filter)
          .skip(skip)
          .limit(parseInt(limit))
          .sort(sort)
          .populate('assignedTo', 'name email role')
          .populate('createdBy', 'name email role')
          .lean(),
        Task.countDocuments(filter)
      ]);

      return paginatedResponse(res, tasks, parseInt(page), parseInt(limit), total);
    } catch (error) {
      console.error('Get tasks error:', error);
      return errorResponse(res, 'Failed to fetch tasks', 500);
    }
  }

  async getTaskById (req, res) {
    try {
      const { id } = req.params;
      const task = await Task.findById(id)
        .populate('assignedTo', 'name email role')
        .populate('createdBy', 'name email role');
      if (!task || task.isDeleted) return errorResponse(res, 'Task not found', 404);

      if (req.user.role !== 'admin' && String(task.createdBy._id) !== String(req.user.id) && String(task.assignedTo) !== String(req.user.id)) {
        return errorResponse(res, 'Forbidden', 403);
      }

      return successResponse(res, task, 'Task retrieved successfully');
    } catch (error) {
      console.error('Get task by id error:', error);
      return errorResponse(res, 'Failed to fetch task', 500);
    }
  }

  async updateTask (req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const task = await Task.findById(id);
      if (!task || task.isDeleted) return errorResponse(res, 'Task not found', 404);

      if (req.user.role !== 'admin' && String(task.createdBy) !== String(req.user.id) && String(task.assignedTo) !== String(req.user.id)) {
        return errorResponse(res, 'Forbidden', 403);
      }

      const before = { status: task.status, priority: task.priority };
      Object.assign(task, updates);
      await task.save();
      await TaskActivity.create({ task: task._id, user: req.user.id, action: 'task_updated', details: { before, updates } });
      return successResponse(res, task, 'Task updated successfully');
    } catch (error) {
      console.error('Update task error:', error);
      return errorResponse(res, 'Failed to update task', 500);
    }
  }

  async updateTaskStatus (req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const task = await Task.findById(id);
      if (!task || task.isDeleted) return errorResponse(res, 'Task not found', 404);

      if (req.user.role !== 'admin' && String(task.createdBy) !== String(req.user.id) && String(task.assignedTo) !== String(req.user.id)) {
        return errorResponse(res, 'Forbidden', 403);
      }

      const from = task.status;
      task.status = status;
      await task.save();
      await TaskActivity.create({ task: task._id, user: req.user.id, action: 'task_status_updated', details: { from, to: status } });
      return successResponse(res, task, 'Task status updated successfully');
    } catch (error) {
      console.error('Update task status error:', error);
      return errorResponse(res, 'Failed to update task status', 500);
    }
  }

  async deleteTask (req, res) {
    try {
      const { id } = req.params;
      const task = await Task.findById(id);
      if (!task || task.isDeleted) return errorResponse(res, 'Task not found', 404);

      if (req.user.role !== 'admin' && String(task.createdBy) !== String(req.user.id)) {
        return errorResponse(res, 'Forbidden', 403);
      }

      task.isDeleted = true;
      task.deletedAt = new Date();
      task.deletedBy = req.user.id;
      await task.save();
      await TaskActivity.create({ task: task._id, user: req.user.id, action: 'task_deleted' });
      return successResponse(res, null, 'Task deleted successfully (soft)');
    } catch (error) {
      console.error('Delete task error:', error);
      return errorResponse(res, 'Failed to delete task', 500);
    }
  }

  async addComment (req, res) {
    try {
      const { id } = req.params;
      const { text } = req.body;
      const task = await Task.findById(id);
      if (!task || task.isDeleted) return errorResponse(res, 'Task not found', 404);

      if (req.user.role !== 'admin' && String(task.createdBy) !== String(req.user.id) && String(task.assignedTo) !== String(req.user.id)) {
        return errorResponse(res, 'Forbidden', 403);
      }

      const comment = { user: req.user.id, text, createdAt: new Date() };
      task.comments.push(comment);
      await task.save();
      await TaskActivity.create({ task: task._id, user: req.user.id, action: 'comment_added', details: { text } });
      return successResponse(res, task, 'Comment added');
    } catch (error) {
      console.error('Add comment error:', error);
      return errorResponse(res, 'Failed to add comment', 500);
    }
  }

  async addAttachment (req, res) {
    try {
      const { id } = req.params;
      const { url } = req.body;
      const task = await Task.findById(id);
      if (!task || task.isDeleted) return errorResponse(res, 'Task not found', 404);

      if (req.user.role !== 'admin' && String(task.createdBy) !== String(req.user.id) && String(task.assignedTo) !== String(req.user.id)) {
        return errorResponse(res, 'Forbidden', 403);
      }

      task.attachments.push(url);
      await task.save();
      await TaskActivity.create({ task: task._id, user: req.user.id, action: 'attachment_added', details: { url } });
      return successResponse(res, task, 'Attachment added');
    } catch (error) {
      console.error('Add attachment error:', error);
      return errorResponse(res, 'Failed to add attachment', 500);
    }
  }

  async addSubtask (req, res) {
    try {
      const { id } = req.params;
      const { title } = req.body;
      const task = await Task.findById(id);
      if (!task || task.isDeleted) return errorResponse(res, 'Task not found', 404);

      if (req.user.role !== 'admin' && String(task.createdBy) !== String(req.user.id) && String(task.assignedTo) !== String(req.user.id)) {
        return errorResponse(res, 'Forbidden', 403);
      }

      task.subtasks.push({ title, status: 'pending' });
      await task.save();
      await TaskActivity.create({ task: task._id, user: req.user.id, action: 'subtask_added', details: { title } });
      return successResponse(res, task, 'Subtask added');
    } catch (error) {
      console.error('Add subtask error:', error);
      return errorResponse(res, 'Failed to add subtask', 500);
    }
  }

  async updateSubtask (req, res) {
    try {
      const { id, subId } = req.params;
      const updates = req.body;
      const task = await Task.findById(id);
      if (!task || task.isDeleted) return errorResponse(res, 'Task not found', 404);

      if (req.user.role !== 'admin' && String(task.createdBy) !== String(req.user.id) && String(task.assignedTo) !== String(req.user.id)) {
        return errorResponse(res, 'Forbidden', 403);
      }

      const subtask = task.subtasks.id(subId);
      if (!subtask) return errorResponse(res, 'Subtask not found', 404);

      Object.assign(subtask, updates);
      await task.save();
      await TaskActivity.create({ task: task._id, user: req.user.id, action: 'subtask_updated', details: { subId, updates } });
      return successResponse(res, task, 'Subtask updated');
    } catch (error) {
      console.error('Update subtask error:', error);
      return errorResponse(res, 'Failed to update subtask', 500);
    }
  }

  async getActivity (req, res) {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '10', 10);
      const skip = (page - 1) * limit;

      const task = await Task.findById(id);
      if (!task || task.isDeleted) return errorResponse(res, 'Task not found', 404);

      if (req.user.role !== 'admin' && String(task.createdBy) !== String(req.user.id) && String(task.assignedTo) !== String(req.user.id)) {
        return errorResponse(res, 'Forbidden', 403);
      }

      const [items, total] = await Promise.all([
        TaskActivity.find({ task: id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        TaskActivity.countDocuments({ task: id })
      ]);

      return paginatedResponse(res, items, page, limit, total);
    } catch (error) {
      console.error('Get activity error:', error);
      return errorResponse(res, 'Failed to fetch activity', 500);
    }
  }
}

module.exports = new TaskController();


