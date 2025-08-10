'use strict';

const Joi = require('joi');

const id = Joi.string().regex(/^[0-9a-fA-F]{24}$/).message('Invalid MongoDB ObjectId');
const email = Joi.string().email().lowercase().trim();
const name = Joi.string().trim().min(1).max(50);
const password = Joi.string().min(6);
const role = Joi.string().valid('user', 'admin');

const createUserSchema = Joi.object({
  name: name.required(),
  email: email.required(),
  password: password.required(),
  role: role.default('user')
});

const updateUserSchema = Joi.object({
  name: name.optional(),
  email: email.optional(),
  role: role.optional(),
  isActive: Joi.boolean().optional()
}).min(1);

const userIdParamSchema = Joi.object({
  id: id.required()
});

const searchUsersQuerySchema = Joi.object({
  query: Joi.string().allow('', null),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  role: role.optional()
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  searchUsersQuerySchema
};


