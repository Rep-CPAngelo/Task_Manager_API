'use strict';

const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).message('Invalid MongoDB ObjectId');

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
  assignedTo: objectId.allow(null, ''),
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
  assignedTo: objectId.allow(null, ''),
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

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  updateStatusSchema,
  taskIdParamSchema,
  listTasksQuerySchema
};


