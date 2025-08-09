'use strict';

const Joi = require('joi');

const email = Joi.string().email().lowercase().trim();
const name = Joi.string().trim().min(1).max(50);
const password = Joi.string().min(6);

const registerSchema = Joi.object({
  name: name.required(),
  email: email.required(),
  password: password.required()
});

const loginSchema = Joi.object({
  email: email.required(),
  password: Joi.string().required()
});

const updateProfileSchema = Joi.object({
  name: name.required(),
  email: email.required()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: password.required()
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required()
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  refreshSchema
};


