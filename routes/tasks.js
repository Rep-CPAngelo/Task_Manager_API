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
  listTasksQuerySchema
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

module.exports = router;


