'use strict';

const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).messages({
  'string.pattern.base': 'Invalid MongoDB ObjectId'
});

const subtask = Joi.object({
  title: Joi.string().trim().min(1).required(),
  status: Joi.string().valid('pending', 'completed').default('pending')
});

const createTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().allow('', null).default(''),
  status: Joi.string().valid('pending', 'in-progress', 'completed', 'overdue').default('pending'),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  dueDate: Joi.date().optional(),
  assignedTo: objectId.allow(null, '').optional(),
  labels: Joi.array().items(Joi.string().trim()).default([]),
  subtasks: Joi.array().items(subtask).default([]),
  attachments: Joi.array().items(Joi.string().uri()).default([])
});

const updateTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).optional(),
  description: Joi.string().allow('', null).optional(),
  status: Joi.string().valid('pending', 'in-progress', 'completed', 'overdue').optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  dueDate: Joi.date().optional(),
  assignedTo: objectId.allow(null, '').optional(),
  labels: Joi.array().items(Joi.string().trim()).optional(),
  subtasks: Joi.array().items(subtask).optional(),
  attachments: Joi.array().items(Joi.string().uri()).optional()
}).min(1);

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'in-progress', 'completed', 'overdue').required()
});

const taskIdParamSchema = Joi.object({ id: objectId.required() });

const listTasksQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid('pending', 'in-progress', 'completed', 'overdue').optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  q: Joi.string().allow('', null),
  assignedTo: objectId.optional(),
  createdBy: objectId.optional(),
  dueFrom: Joi.date().optional(),
  dueTo: Joi.date().optional(),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'dueDate', 'priority', 'status').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

const addCommentSchema = Joi.object({
  text: Joi.string().trim().min(1).required()
});

const addAttachmentSchema = Joi.object({
  url: Joi.string().uri().required()
});

const addSubtaskSchema = Joi.object({
  title: Joi.string().trim().min(1).required()
});

const updateSubtaskSchema = Joi.object({
  title: Joi.string().trim().min(1).optional(),
  status: Joi.string().valid('pending', 'completed').optional()
}).min(1);

const subtaskIdParamSchema = Joi.object({
  id: objectId.required(),
  subId: objectId.required()
});

// Recurring task schemas
const recurrenceSchema = Joi.object({
  frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').required(),
  interval: Joi.number().integer().min(1).max(365).default(1),
  daysOfWeek: Joi.array().items(Joi.number().integer().min(0).max(6)).default([]),
  dayOfMonth: Joi.number().integer().min(1).max(31).optional(),
  endDate: Joi.date().min('now').optional(),
  maxOccurrences: Joi.number().integer().min(1).max(1000).optional()
});

const createRecurringTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().allow('', null).default(''),
  status: Joi.string().valid('pending', 'in-progress', 'completed', 'overdue').default('pending'),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  dueDate: Joi.date().required(),
  assignedTo: objectId.allow(null, '').optional(),
  labels: Joi.array().items(Joi.string().trim()).default([]),
  subtasks: Joi.array().items(subtask).default([]),
  attachments: Joi.array().items(Joi.string().uri()).default([]),
  isRecurring: Joi.boolean().valid(true).required(),
  recurrence: recurrenceSchema.required(),
  nextDueDate: Joi.date().min('now').optional()
});

const updateRecurrenceSchema = Joi.object({
  frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').optional(),
  interval: Joi.number().integer().min(1).max(365).optional(),
  daysOfWeek: Joi.array().items(Joi.number().integer().min(0).max(6)).optional(),
  dayOfMonth: Joi.number().integer().min(1).max(31).optional(),
  endDate: Joi.date().min('now').allow(null).optional(),
  maxOccurrences: Joi.number().integer().min(1).max(1000).allow(null).optional()
}).min(1);

const recurringTaskInstancesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'dueDate', 'status').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

module.exports = {
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
};


