'use strict';

const Joi = require('joi');

/**
 * Notification preference update schema
 */
const notificationPreferenceSchema = Joi.object({
  globalEnabled: Joi.boolean(),

  channels: Joi.object({
    email: Joi.object({
      enabled: Joi.boolean(),
      address: Joi.string().email()
    }),
    inApp: Joi.object({
      enabled: Joi.boolean()
    }),
    push: Joi.object({
      enabled: Joi.boolean()
    })
  }),

  preferences: Joi.object({
    taskDueSoon: Joi.object({
      enabled: Joi.boolean(),
      channels: Joi.array().items(Joi.string().valid('email', 'in_app', 'push')),
      advance: Joi.number().min(1).max(168) // 1 hour to 1 week
    }),
    taskDueUrgent: Joi.object({
      enabled: Joi.boolean(),
      channels: Joi.array().items(Joi.string().valid('email', 'in_app', 'push')),
      advance: Joi.number().min(0.25).max(12) // 15 minutes to 12 hours
    }),
    taskOverdue: Joi.object({
      enabled: Joi.boolean(),
      channels: Joi.array().items(Joi.string().valid('email', 'in_app', 'push')),
      frequency: Joi.string().valid('once', 'daily', 'weekly')
    }),
    taskAssigned: Joi.object({
      enabled: Joi.boolean(),
      channels: Joi.array().items(Joi.string().valid('email', 'in_app', 'push'))
    }),
    taskCompleted: Joi.object({
      enabled: Joi.boolean(),
      channels: Joi.array().items(Joi.string().valid('email', 'in_app', 'push'))
    }),
    taskUpdated: Joi.object({
      enabled: Joi.boolean(),
      channels: Joi.array().items(Joi.string().valid('email', 'in_app', 'push'))
    })
  }),

  quietHours: Joi.object({
    enabled: Joi.boolean(),
    start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    timezone: Joi.string()
  }),

  digest: Joi.object({
    enabled: Joi.boolean(),
    frequency: Joi.string().valid('daily', 'weekly'),
    time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  })
});

/**
 * Test notification schema
 */
const testNotificationSchema = Joi.object({
  type: Joi.string()
    .valid(
      'task_due_soon',
      'task_due_urgent',
      'task_overdue',
      'task_assigned',
      'task_completed',
      'task_updated',
      'reminder_custom'
    )
    .required()
    .messages({
      'any.required': 'Notification type is required',
      'any.only': 'Invalid notification type'
    }),

  recipient: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'any.required': 'Recipient user ID is required',
      'string.pattern.base': 'Invalid recipient user ID format'
    }),

  testData: Joi.object({
    taskTitle: Joi.string().max(200),
    taskDescription: Joi.string().max(1000),
    dueDate: Joi.date(),
    priority: Joi.string().valid('low', 'medium', 'high'),
    assignedBy: Joi.string()
  }).default({})
});

/**
 * Manual notification creation schema (for admin use)
 */
const createNotificationSchema = Joi.object({
  type: Joi.string()
    .valid(
      'task_due_soon',
      'task_due_urgent',
      'task_overdue',
      'task_assigned',
      'task_completed',
      'task_updated',
      'reminder_custom'
    )
    .required(),

  recipient: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),

  title: Joi.string()
    .max(200)
    .required(),

  message: Joi.string()
    .max(1000)
    .required(),

  relatedTask: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/),

  relatedUser: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/),

  scheduledFor: Joi.date()
    .default(() => new Date()),

  channels: Joi.array()
    .items(Joi.string().valid('email', 'in_app', 'push'))
    .default(['email', 'in_app']),

  metadata: Joi.object().default({})
});

/**
 * Query parameters schema for notification listing
 */
const notificationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  unreadOnly: Joi.boolean().default(false),
  type: Joi.string().valid(
    'task_due_soon',
    'task_due_urgent',
    'task_overdue',
    'task_assigned',
    'task_completed',
    'task_updated',
    'reminder_custom'
  )
});

/**
 * Statistics query schema
 */
const statsQuerySchema = Joi.object({
  startDate: Joi.date(),
  endDate: Joi.date().min(Joi.ref('startDate'))
});

module.exports = {
  notificationPreferenceSchema,
  testNotificationSchema,
  createNotificationSchema,
  notificationQuerySchema,
  statsQuerySchema
};