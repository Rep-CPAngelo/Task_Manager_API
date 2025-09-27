'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const taskController = require('../controllers/taskController');
const {
  createTaskSchema,
  updateTaskSchema,
  updateStatusSchema,
  taskIdParamSchema,
  listTasksQuerySchema,
  addCommentSchema,
  addAttachmentSchema,
  addSubtaskSchema,
  updateSubtaskSchema,
  subtaskIdParamSchema,
  // Recurring task schemas
  createRecurringTaskSchema,
  updateRecurrenceSchema,
  recurringTaskInstancesQuerySchema
} = require('../validations/taskSchemas');

// Create task
router.post('/', auth, validate(createTaskSchema), taskController.createTask);

// List tasks (with filters/pagination)
router.get('/', auth, validate(listTasksQuerySchema, 'query'), taskController.getTasks);

// Get task by id
router.get('/:id', auth, validate(taskIdParamSchema, 'params'), taskController.getTaskById);

// Update task
router.patch('/:id', auth, validate(taskIdParamSchema, 'params'), validate(updateTaskSchema), taskController.updateTask);

// Update task status
router.patch('/:id/status', auth, validate(taskIdParamSchema, 'params'), validate(updateStatusSchema), taskController.updateTaskStatus);

// Delete task
router.delete('/:id', auth, validate(taskIdParamSchema, 'params'), taskController.deleteTask);

// Add comment
router.post('/:id/comments', auth, validate(taskIdParamSchema, 'params'), validate(addCommentSchema), taskController.addComment);

// Add attachment (URL-based for now)
router.post('/:id/attachments', auth, validate(taskIdParamSchema, 'params'), validate(addAttachmentSchema), taskController.addAttachment);

// Add subtask
router.post('/:id/subtasks', auth, validate(taskIdParamSchema, 'params'), validate(addSubtaskSchema), taskController.addSubtask);

// Update subtask
router.patch('/:id/subtasks/:subId', auth, validate(subtaskIdParamSchema, 'params'), validate(updateSubtaskSchema), taskController.updateSubtask);

// Activity feed
router.get('/:id/activity', auth, validate(taskIdParamSchema, 'params'), taskController.getActivity);

// Recurring task routes
// Create recurring task
router.post('/recurring', auth, validate(createRecurringTaskSchema), taskController.createRecurringTask);

// Update recurrence settings
router.patch('/:id/recurrence', auth, validate(taskIdParamSchema, 'params'), validate(updateRecurrenceSchema), taskController.updateRecurrence);

// Get recurring task instances
router.get('/:id/instances', auth, validate(taskIdParamSchema, 'params'), validate(recurringTaskInstancesQuerySchema, 'query'), taskController.getRecurringTaskInstances);

// Generate due recurring tasks (admin only)
router.post('/recurring/generate', auth, taskController.generateRecurringTasks);

module.exports = router;


