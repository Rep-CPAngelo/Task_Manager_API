'use strict';

const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).messages({
  'string.pattern.base': 'Invalid MongoDB ObjectId'
});

const hexColor = Joi.string().regex(/^#[0-9A-Fa-f]{6}$/).messages({
  'string.pattern.base': 'Invalid hex color format (must be #RRGGBB)'
});

const columnSchema = Joi.object({
  title: Joi.string().trim().min(1).max(100).required(),
  position: Joi.number().integer().min(0).optional(),
  color: hexColor.default('#3498db'),
  wipLimit: Joi.number().integer().min(0).allow(null).optional(),
  isCollapsed: Joi.boolean().default(false)
});

const memberSchema = Joi.object({
  user: objectId.required(),
  role: Joi.string().valid('owner', 'admin', 'member', 'viewer').default('member')
});

const settingsSchema = Joi.object({
  allowGuestView: Joi.boolean().default(false),
  requireApprovalForJoin: Joi.boolean().default(true),
  defaultTaskPriority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  enableWipLimits: Joi.boolean().default(false),
  autoArchiveCompleted: Joi.boolean().default(false),
  autoArchiveDays: Joi.number().integer().min(1).max(365).default(30)
});

const createBoardSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().max(1000).allow('').default(''),
  columns: Joi.array().items(columnSchema).min(1).required(),
  visibility: Joi.string().valid('private', 'team', 'public').default('private'),
  settings: settingsSchema.default({}),
  tags: Joi.array().items(Joi.string().trim().max(50)).default([]),
  backgroundColor: hexColor.default('#ffffff')
});

const updateBoardSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).optional(),
  description: Joi.string().trim().max(1000).allow('').optional(),
  visibility: Joi.string().valid('private', 'team', 'public').optional(),
  settings: settingsSchema.optional(),
  tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
  backgroundColor: hexColor.optional()
}).min(1);

const boardIdParamSchema = Joi.object({
  id: objectId.required()
});

const columnIdParamSchema = Joi.object({
  id: objectId.required(),
  columnId: objectId.required()
});

const listBoardsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  visibility: Joi.string().valid('private', 'team', 'public').optional(),
  includeArchived: Joi.boolean().default(false),
  tags: Joi.alternatives().try(
    Joi.string().trim(),
    Joi.array().items(Joi.string().trim())
  ).optional(),
  search: Joi.string().trim().min(1).max(100).optional(),
  sortBy: Joi.string().valid('title', 'createdAt', 'updatedAt', 'lastActivity').default('lastActivity'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

const createColumnSchema = Joi.object({
  title: Joi.string().trim().min(1).max(100).required(),
  position: Joi.number().integer().min(0).optional(),
  color: hexColor.default('#3498db'),
  wipLimit: Joi.number().integer().min(0).allow(null).optional(),
  isCollapsed: Joi.boolean().default(false)
});

const updateColumnSchema = Joi.object({
  title: Joi.string().trim().min(1).max(100).optional(),
  position: Joi.number().integer().min(0).optional(),
  color: hexColor.optional(),
  wipLimit: Joi.number().integer().min(0).allow(null).optional(),
  isCollapsed: Joi.boolean().optional()
}).min(1);

const reorderColumnsSchema = Joi.object({
  columns: Joi.array().items(
    Joi.object({
      columnId: objectId.required(),
      position: Joi.number().integer().min(0).required()
    })
  ).min(1).required()
});

const addMemberSchema = Joi.object({
  userId: objectId.required(),
  role: Joi.string().valid('admin', 'member', 'viewer').default('member')
});

const updateMemberSchema = Joi.object({
  role: Joi.string().valid('admin', 'member', 'viewer').required()
});

const memberIdParamSchema = Joi.object({
  id: objectId.required(),
  userId: objectId.required()
});

const moveTaskToBoardSchema = Joi.object({
  taskId: objectId.required(),
  targetColumnId: objectId.required(),
  position: Joi.number().integer().min(0).default(0)
});

const moveTaskSchema = Joi.object({
  sourceColumnId: objectId.required(),
  targetColumnId: objectId.required(),
  sourcePosition: Joi.number().integer().min(0).required(),
  targetPosition: Joi.number().integer().min(0).required()
});

const bulkMoveTasksSchema = Joi.object({
  moves: Joi.array().items(
    Joi.object({
      taskId: objectId.required(),
      sourceColumnId: objectId.required(),
      targetColumnId: objectId.required(),
      sourcePosition: Joi.number().integer().min(0).required(),
      targetPosition: Joi.number().integer().min(0).required()
    })
  ).min(1).max(50).required()
});

const archiveBoardSchema = Joi.object({
  archived: Joi.boolean().required()
});

const duplicateBoardSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  includetasks: Joi.boolean().default(false),
  includeMembers: Joi.boolean().default(false)
});

const boardStatsQuerySchema = Joi.object({
  period: Joi.string().valid('week', 'month', 'quarter', 'year').default('month'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().min(Joi.ref('startDate')).optional()
});

const boardActivitiesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  activityType: Joi.string().valid(
    'task_created', 'task_updated', 'task_moved', 'task_completed',
    'column_added', 'column_updated', 'column_removed',
    'member_added', 'member_removed', 'board_updated'
  ).optional(),
  userId: objectId.optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().min(Joi.ref('startDate')).optional()
});

const exportBoardSchema = Joi.object({
  format: Joi.string().valid('json', 'csv').default('json'),
  includeCompleted: Joi.boolean().default(true),
  includeArchived: Joi.boolean().default(false)
});

const reorderTasksInColumnSchema = Joi.object({
  taskOrder: Joi.array().items(objectId).min(1).required()
});

const taskIdParamSchema = Joi.object({
  id: objectId.required(),
  taskId: objectId.required()
});

// Board sharing schemas
const inviteToBoardSchema = Joi.object({
  email: Joi.string().email().optional(),
  userId: objectId.optional(),
  role: Joi.string().valid('admin', 'member', 'viewer').default('member'),
  message: Joi.string().trim().max(500).optional(),
  inviteType: Joi.string().valid('direct', 'email', 'link').default('direct')
}).xor('email', 'userId');

const invitationTokenParamSchema = Joi.object({
  token: Joi.string().required()
});

const invitationIdParamSchema = Joi.object({
  id: objectId.required(),
  invitationId: objectId.required()
});

const getBoardInvitationsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'accepted', 'declined', 'expired', 'cancelled').optional()
});

const generateSharingLinkSchema = Joi.object({
  role: Joi.string().valid('admin', 'member', 'viewer').default('viewer'),
  expiresIn: Joi.number().integer().min(1000).max(30 * 24 * 60 * 60 * 1000).default(7 * 24 * 60 * 60 * 1000) // 7 days default, 30 days max
});

const updateBoardPermissionsSchema = Joi.object({
  visibility: Joi.string().valid('private', 'team', 'public').optional(),
  settings: Joi.object({
    allowGuestView: Joi.boolean().optional(),
    requireApprovalForJoin: Joi.boolean().optional(),
    defaultTaskPriority: Joi.string().valid('low', 'medium', 'high').optional(),
    enableWipLimits: Joi.boolean().optional(),
    autoArchiveCompleted: Joi.boolean().optional(),
    autoArchiveDays: Joi.number().integer().min(1).max(365).optional()
  }).optional()
}).min(1);

const joinRequestSchema = Joi.object({
  message: Joi.string().trim().max(500).optional()
});

module.exports = {
  createBoardSchema,
  updateBoardSchema,
  boardIdParamSchema,
  columnIdParamSchema,
  listBoardsQuerySchema,
  createColumnSchema,
  updateColumnSchema,
  reorderColumnsSchema,
  addMemberSchema,
  updateMemberSchema,
  memberIdParamSchema,
  moveTaskToBoardSchema,
  moveTaskSchema,
  bulkMoveTasksSchema,
  archiveBoardSchema,
  duplicateBoardSchema,
  boardStatsQuerySchema,
  boardActivitiesQuerySchema,
  exportBoardSchema,
  reorderTasksInColumnSchema,
  taskIdParamSchema,
  // Board sharing schemas
  inviteToBoardSchema,
  invitationTokenParamSchema,
  invitationIdParamSchema,
  getBoardInvitationsQuerySchema,
  generateSharingLinkSchema,
  updateBoardPermissionsSchema,
  joinRequestSchema
};