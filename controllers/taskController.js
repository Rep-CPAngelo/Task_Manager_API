'use strict';

const Task = require('../models/Task');
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
          .populate('createdBy', 'name email role'),
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

      Object.assign(task, updates);
      await task.save();
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

      task.status = status;
      await task.save();
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
      return successResponse(res, null, 'Task deleted successfully (soft)');
    } catch (error) {
      console.error('Delete task error:', error);
      return errorResponse(res, 'Failed to delete task', 500);
    }
  }
}

module.exports = new TaskController();


