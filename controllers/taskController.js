'use strict';

const taskService = require('../services/taskService');
const recurringTaskService = require('../services/recurringTaskService');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

class TaskController {
  async createTask (req, res) {
    try {
      const { title, description, status, priority, dueDate, assignedTo, labels, subtasks, attachments } = req.body;
      const taskData = {
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
      };

      const task = await taskService.createTask(taskData);
      return successResponse(res, task, 'Task created successfully', 201);
    } catch (error) {
      console.error('Create task error:', error);
      return errorResponse(res, 'Failed to create task', 500);
    }
  }

  async getTasks (req, res) {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      const filter = taskService.buildTaskFilter(req.query, req.user);
      const options = { page, limit, sortBy, sortOrder };

      const result = await taskService.getTasks(filter, options);
      return paginatedResponse(res, result.tasks, result.pagination.current, result.pagination.limit, result.pagination.total);
    } catch (error) {
      console.error('Get tasks error:', error);
      return errorResponse(res, 'Failed to fetch tasks', 500);
    }
  }

  async getTaskById (req, res) {
    try {
      const { id } = req.params;
      const task = await taskService.getTaskById(id);
      if (!task || task.isDeleted) return errorResponse(res, 'Task not found', 404);

      if (!taskService.hasTaskPermission(task, req.user)) {
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
      const task = await taskService.getTaskById(id);
      if (!task || task.isDeleted) return errorResponse(res, 'Task not found', 404);

      if (!taskService.hasTaskPermission(task, req.user)) {
        return errorResponse(res, 'Forbidden', 403);
      }

      const updatedTask = await taskService.updateTask(id, updates, req.user.id);
      return successResponse(res, updatedTask, 'Task updated successfully');
    } catch (error) {
      console.error('Update task error:', error);
      return errorResponse(res, error.message || 'Failed to update task', 500);
    }
  }

  async updateTaskStatus (req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const task = await taskService.getTaskById(id);
      if (!task || task.isDeleted) return errorResponse(res, 'Task not found', 404);

      if (!taskService.hasTaskPermission(task, req.user)) {
        return errorResponse(res, 'Forbidden', 403);
      }

      const updatedTask = await taskService.updateTaskStatus(id, status, req.user.id);
      return successResponse(res, updatedTask, 'Task status updated successfully');
    } catch (error) {
      console.error('Update task status error:', error);
      return errorResponse(res, error.message || 'Failed to update task status', 500);
    }
  }

  async deleteTask (req, res) {
    try {
      const { id } = req.params;
      const task = await taskService.getTaskById(id);
      if (!task || task.isDeleted) return errorResponse(res, 'Task not found', 404);

      if (!taskService.hasTaskPermission(task, req.user, true)) {
        return errorResponse(res, 'Forbidden', 403);
      }

      await taskService.deleteTask(id, req.user.id);
      return successResponse(res, null, 'Task deleted successfully (soft)');
    } catch (error) {
      console.error('Delete task error:', error);
      return errorResponse(res, error.message || 'Failed to delete task', 500);
    }
  }

  async addComment (req, res) {
    try {
      const { id } = req.params;
      const { text } = req.body;
      const task = await taskService.getTaskById(id);
      if (!task || task.isDeleted) return errorResponse(res, 'Task not found', 404);

      if (!taskService.hasTaskPermission(task, req.user)) {
        return errorResponse(res, 'Forbidden', 403);
      }

      const updatedTask = await taskService.addComment(id, text, req.user.id);
      return successResponse(res, updatedTask, 'Comment added');
    } catch (error) {
      console.error('Add comment error:', error);
      return errorResponse(res, error.message || 'Failed to add comment', 500);
    }
  }

  async addAttachment (req, res) {
    try {
      const { id } = req.params;
      const { url } = req.body;
      const task = await taskService.getTaskById(id);
      if (!task || task.isDeleted) return errorResponse(res, 'Task not found', 404);

      if (!taskService.hasTaskPermission(task, req.user)) {
        return errorResponse(res, 'Forbidden', 403);
      }

      const updatedTask = await taskService.addAttachment(id, url, req.user.id);
      return successResponse(res, updatedTask, 'Attachment added');
    } catch (error) {
      console.error('Add attachment error:', error);
      return errorResponse(res, error.message || 'Failed to add attachment', 500);
    }
  }

  async addSubtask (req, res) {
    try {
      const { id } = req.params;
      const { title } = req.body;
      const task = await taskService.getTaskById(id);
      if (!task || task.isDeleted) return errorResponse(res, 'Task not found', 404);

      if (!taskService.hasTaskPermission(task, req.user)) {
        return errorResponse(res, 'Forbidden', 403);
      }

      const updatedTask = await taskService.addSubtask(id, title, req.user.id);
      return successResponse(res, updatedTask, 'Subtask added');
    } catch (error) {
      console.error('Add subtask error:', error);
      return errorResponse(res, error.message || 'Failed to add subtask', 500);
    }
  }

  async updateSubtask (req, res) {
    try {
      const { id, subId } = req.params;
      const updates = req.body;
      const task = await taskService.getTaskById(id);
      if (!task || task.isDeleted) return errorResponse(res, 'Task not found', 404);

      if (!taskService.hasTaskPermission(task, req.user)) {
        return errorResponse(res, 'Forbidden', 403);
      }

      const updatedTask = await taskService.updateSubtask(id, subId, updates, req.user.id);
      return successResponse(res, updatedTask, 'Subtask updated');
    } catch (error) {
      console.error('Update subtask error:', error);
      return errorResponse(res, error.message || 'Failed to update subtask', 500);
    }
  }

  async getActivity (req, res) {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '10', 10);

      const task = await taskService.getTaskById(id);
      if (!task || task.isDeleted) return errorResponse(res, 'Task not found', 404);

      if (!taskService.hasTaskPermission(task, req.user)) {
        return errorResponse(res, 'Forbidden', 403);
      }

      const result = await taskService.getTaskActivity(id, { page, limit });
      return paginatedResponse(res, result.items, result.pagination.current, result.pagination.limit, result.pagination.total);
    } catch (error) {
      console.error('Get activity error:', error);
      return errorResponse(res, 'Failed to fetch activity', 500);
    }
  }

  // Recurring task methods
  async createRecurringTask (req, res) {
    try {
      const taskData = { ...req.body, createdBy: req.user.id };
      const recurringTask = await recurringTaskService.createRecurringTask(taskData);
      await TaskActivity.create({ task: recurringTask._id, user: req.user.id, action: 'recurring_task_created', details: { title: recurringTask.title, frequency: recurringTask.recurrence.frequency } });
      return successResponse(res, recurringTask, 'Recurring task created successfully', 201);
    } catch (error) {
      console.error('Create recurring task error:', error);
      return errorResponse(res, error.message || 'Failed to create recurring task', 500);
    }
  }

  async updateRecurrence (req, res) {
    try {
      const { id } = req.params;
      const task = await Task.findById(id);
      if (!task || task.isDeleted) return errorResponse(res, 'Task not found', 404);

      if (req.user.role !== 'admin' && String(task.createdBy) !== String(req.user.id)) {
        return errorResponse(res, 'Forbidden', 403);
      }

      if (!task.isRecurring) return errorResponse(res, 'Task is not recurring', 400);

      const updatedTask = await recurringTaskService.updateRecurringTask(id, req.body);
      await TaskActivity.create({ task: task._id, user: req.user.id, action: 'recurrence_updated', details: { updates: req.body } });
      return successResponse(res, updatedTask, 'Recurrence settings updated successfully');
    } catch (error) {
      console.error('Update recurrence error:', error);
      return errorResponse(res, error.message || 'Failed to update recurrence', 500);
    }
  }

  async getRecurringTaskInstances (req, res) {
    try {
      const { id } = req.params;
      const task = await Task.findById(id);
      if (!task || task.isDeleted) return errorResponse(res, 'Task not found', 404);

      if (req.user.role !== 'admin' && String(task.createdBy) !== String(req.user.id) && String(task.assignedTo) !== String(req.user.id)) {
        return errorResponse(res, 'Forbidden', 403);
      }

      if (!task.isRecurring) return errorResponse(res, 'Task is not recurring', 400);

      const result = await recurringTaskService.getTaskInstances(id, req.query);
      return paginatedResponse(res, result.instances, result.pagination.current, result.pagination.limit, result.pagination.total);
    } catch (error) {
      console.error('Get recurring task instances error:', error);
      return errorResponse(res, 'Failed to fetch task instances', 500);
    }
  }

  async generateRecurringTasks (req, res) {
    try {
      // This endpoint is for admin/system use to manually trigger task generation
      if (req.user.role !== 'admin') {
        return errorResponse(res, 'Forbidden - Admin access required', 403);
      }

      const createdTasks = await recurringTaskService.generateDueRecurringTasks();
      return successResponse(res, { count: createdTasks.length, tasks: createdTasks }, `Generated ${createdTasks.length} recurring task instances`);
    } catch (error) {
      console.error('Generate recurring tasks error:', error);
      return errorResponse(res, 'Failed to generate recurring tasks', 500);
    }
  }
}

module.exports = new TaskController();


