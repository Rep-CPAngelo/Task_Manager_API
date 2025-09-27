'use strict';

const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).messages({
  'string.pattern.base': 'Invalid MongoDB ObjectId'
});

// Analytics query parameters
const analyticsQuerySchema = Joi.object({
  period: Joi.string().valid('day', 'week', 'month', 'quarter', 'year').default('month'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().min(Joi.ref('startDate')).optional(),
  teamId: objectId.optional()
});

// Board analytics parameters
const boardAnalyticsParamSchema = Joi.object({
  boardId: objectId.required()
});

// Export analytics query
const exportAnalyticsQuerySchema = Joi.object({
  type: Joi.string().valid('user', 'team', 'board', 'system').default('user'),
  format: Joi.string().valid('json', 'csv').default('json'),
  period: Joi.string().valid('day', 'week', 'month', 'quarter', 'year').default('month'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().min(Joi.ref('startDate')).optional(),
  boardId: Joi.when('type', {
    is: 'board',
    then: objectId.required(),
    otherwise: objectId.optional()
  })
});

// Dashboard query parameters
const dashboardQuerySchema = Joi.object({
  period: Joi.string().valid('day', 'week', 'month').default('week'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().min(Joi.ref('startDate')).optional()
});

// Productivity insights query
const productivityInsightsQuerySchema = Joi.object({
  period: Joi.string().valid('week', 'month', 'quarter').default('month'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().min(Joi.ref('startDate')).optional(),
  includeRecommendations: Joi.boolean().default(true)
});

// Collaboration metrics query
const collaborationMetricsQuerySchema = Joi.object({
  period: Joi.string().valid('week', 'month', 'quarter').default('month'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().min(Joi.ref('startDate')).optional(),
  teamId: objectId.optional()
});

// System analytics query (admin only)
const systemAnalyticsQuerySchema = Joi.object({
  period: Joi.string().valid('day', 'week', 'month', 'quarter', 'year').default('month'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().min(Joi.ref('startDate')).optional(),
  includeDetails: Joi.boolean().default(false)
});

module.exports = {
  analyticsQuerySchema,
  boardAnalyticsParamSchema,
  exportAnalyticsQuerySchema,
  dashboardQuerySchema,
  productivityInsightsQuerySchema,
  collaborationMetricsQuerySchema,
  systemAnalyticsQuerySchema
};