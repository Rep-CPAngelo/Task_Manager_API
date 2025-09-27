'use strict';

const express = require('express');
const router = express.Router();
const boardController = require('../controllers/boardController');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
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
  archiveBoardSchema,
  duplicateBoardSchema,
  boardStatsQuerySchema,
  moveTaskToBoardSchema,
  moveTaskSchema,
  bulkMoveTasksSchema,
  reorderTasksInColumnSchema,
  taskIdParamSchema,
  // Board sharing schemas
  inviteToBoardSchema,
  invitationTokenParamSchema,
  invitationIdParamSchema,
  getBoardInvitationsQuerySchema,
  generateSharingLinkSchema,
  updateBoardPermissionsSchema
} = require('../validations/boardSchemas');

// Apply authentication to all board routes
router.use(authMiddleware);

/**
 * @swagger
 * components:
 *   schemas:
 *     Board:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Board ID
 *         title:
 *           type: string
 *           description: Board title
 *         description:
 *           type: string
 *           description: Board description
 *         owner:
 *           type: string
 *           description: Board owner user ID
 *         columns:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Column'
 *         members:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BoardMember'
 *         visibility:
 *           type: string
 *           enum: [private, team, public]
 *         settings:
 *           $ref: '#/components/schemas/BoardSettings'
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         backgroundColor:
 *           type: string
 *           pattern: '^#[0-9A-Fa-f]{6}$'
 *         isArchived:
 *           type: boolean
 *         stats:
 *           $ref: '#/components/schemas/BoardStats'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: "60d5ec49f1b2c8b1f8e4e123"
 *         title: "Project Management Board"
 *         description: "Main project tracking board"
 *         visibility: "team"
 *         tags: ["development", "sprint"]
 *         backgroundColor: "#ffffff"
 *         isArchived: false
 *
 *     Column:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *         position:
 *           type: integer
 *         color:
 *           type: string
 *           pattern: '^#[0-9A-Fa-f]{6}$'
 *         wipLimit:
 *           type: integer
 *           nullable: true
 *         isCollapsed:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: "60d5ec49f1b2c8b1f8e4e124"
 *         title: "To Do"
 *         position: 0
 *         color: "#3498db"
 *         wipLimit: null
 *         isCollapsed: false
 *
 *     BoardMember:
 *       type: object
 *       properties:
 *         user:
 *           type: string
 *           description: User ID
 *         role:
 *           type: string
 *           enum: [owner, admin, member, viewer]
 *         addedAt:
 *           type: string
 *           format: date-time
 *         addedBy:
 *           type: string
 *           description: User ID who added this member
 *
 *     BoardSettings:
 *       type: object
 *       properties:
 *         allowGuestView:
 *           type: boolean
 *         requireApprovalForJoin:
 *           type: boolean
 *         defaultTaskPriority:
 *           type: string
 *           enum: [low, medium, high]
 *         enableWipLimits:
 *           type: boolean
 *         autoArchiveCompleted:
 *           type: boolean
 *         autoArchiveDays:
 *           type: integer
 *
 *     BoardStats:
 *       type: object
 *       properties:
 *         totalTasks:
 *           type: integer
 *         completedTasks:
 *           type: integer
 *         activeTasks:
 *           type: integer
 *         lastActivity:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/boards:
 *   post:
 *     summary: Create a new board
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - columns
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               columns:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - title
 *                   properties:
 *                     title:
 *                       type: string
 *                       minLength: 1
 *                       maxLength: 100
 *                     color:
 *                       type: string
 *                       pattern: '^#[0-9A-Fa-f]{6}$'
 *                     wipLimit:
 *                       type: integer
 *                       minimum: 0
 *               visibility:
 *                 type: string
 *                 enum: [private, team, public]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               backgroundColor:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *     responses:
 *       201:
 *         description: Board created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Board'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', validate(createBoardSchema), boardController.createBoard);

/**
 * @swagger
 * /api/boards:
 *   get:
 *     summary: Get boards for authenticated user
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: visibility
 *         schema:
 *           type: string
 *           enum: [private, team, public]
 *       - in: query
 *         name: includeArchived
 *         schema:
 *           type: boolean
 *           default: false
 *       - in: query
 *         name: tags
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [title, createdAt, updatedAt, lastActivity]
 *           default: lastActivity
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Boards retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Board'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationInfo'
 */
router.get('/', validate(listBoardsQuerySchema, 'query'), boardController.getBoards);

/**
 * @swagger
 * /api/boards/public:
 *   get:
 *     summary: Get public boards
 *     tags: [Boards]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: tags
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *     responses:
 *       200:
 *         description: Public boards retrieved successfully
 */
router.get('/public', boardController.getPublicBoards);

/**
 * @swagger
 * /api/boards/{id}:
 *   get:
 *     summary: Get board by ID
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *     responses:
 *       200:
 *         description: Board retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Board'
 *                     - type: object
 *                       properties:
 *                         tasksByColumn:
 *                           type: object
 *                           additionalProperties:
 *                             type: array
 *                             items:
 *                               $ref: '#/components/schemas/Task'
 *       404:
 *         description: Board not found
 *       403:
 *         description: Access denied
 */
router.get('/:id', validate(boardIdParamSchema, 'params'), boardController.getBoardById);

/**
 * @swagger
 * /api/boards/{id}:
 *   patch:
 *     summary: Update board
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               visibility:
 *                 type: string
 *                 enum: [private, team, public]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               backgroundColor:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *     responses:
 *       200:
 *         description: Board updated successfully
 *       404:
 *         description: Board not found
 *       403:
 *         description: Access denied
 */
router.patch('/:id', validate(boardIdParamSchema, 'params'), validate(updateBoardSchema), boardController.updateBoard);

/**
 * @swagger
 * /api/boards/{id}:
 *   delete:
 *     summary: Delete board
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *     responses:
 *       200:
 *         description: Board deleted successfully
 *       400:
 *         description: Cannot delete board with existing tasks
 *       404:
 *         description: Board not found
 *       403:
 *         description: Access denied
 */
router.delete('/:id', validate(boardIdParamSchema, 'params'), boardController.deleteBoard);

/**
 * @swagger
 * /api/boards/{id}/archive:
 *   patch:
 *     summary: Archive or unarchive board
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - archived
 *             properties:
 *               archived:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Board archive status updated
 *       404:
 *         description: Board not found
 *       403:
 *         description: Access denied
 */
router.patch('/:id/archive', validate(boardIdParamSchema, 'params'), validate(archiveBoardSchema), boardController.archiveBoard);

/**
 * @swagger
 * /api/boards/{id}/duplicate:
 *   post:
 *     summary: Duplicate board
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID to duplicate
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *               includeTasks:
 *                 type: boolean
 *                 default: false
 *               includeMembers:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Board duplicated successfully
 *       404:
 *         description: Board not found
 *       403:
 *         description: Access denied
 */
router.post('/:id/duplicate', validate(boardIdParamSchema, 'params'), validate(duplicateBoardSchema), boardController.duplicateBoard);

/**
 * @swagger
 * /api/boards/{id}/stats:
 *   get:
 *     summary: Get board statistics
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year]
 *           default: month
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Board statistics retrieved successfully
 *       404:
 *         description: Board not found
 *       403:
 *         description: Access denied
 */
router.get('/:id/stats', validate(boardIdParamSchema, 'params'), validate(boardStatsQuerySchema, 'query'), boardController.getBoardStats);

// Column management routes
/**
 * @swagger
 * /api/boards/{id}/columns:
 *   post:
 *     summary: Add column to board
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               position:
 *                 type: integer
 *                 minimum: 0
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *               wipLimit:
 *                 type: integer
 *                 minimum: 0
 *               isCollapsed:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Column added successfully
 *       404:
 *         description: Board not found
 *       403:
 *         description: Access denied
 */
router.post('/:id/columns', validate(boardIdParamSchema, 'params'), validate(createColumnSchema), boardController.addColumn);

/**
 * @swagger
 * /api/boards/{id}/columns/{columnId}:
 *   patch:
 *     summary: Update column
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *       - in: path
 *         name: columnId
 *         required: true
 *         schema:
 *           type: string
 *         description: Column ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               position:
 *                 type: integer
 *                 minimum: 0
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *               wipLimit:
 *                 type: integer
 *                 minimum: 0
 *               isCollapsed:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Column updated successfully
 *       404:
 *         description: Board or column not found
 *       403:
 *         description: Access denied
 */
router.patch('/:id/columns/:columnId', validate(columnIdParamSchema, 'params'), validate(updateColumnSchema), boardController.updateColumn);

/**
 * @swagger
 * /api/boards/{id}/columns/{columnId}:
 *   delete:
 *     summary: Remove column from board
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *       - in: path
 *         name: columnId
 *         required: true
 *         schema:
 *           type: string
 *         description: Column ID
 *     responses:
 *       200:
 *         description: Column removed successfully
 *       400:
 *         description: Cannot delete column with existing tasks
 *       404:
 *         description: Board or column not found
 *       403:
 *         description: Access denied
 */
router.delete('/:id/columns/:columnId', validate(columnIdParamSchema, 'params'), boardController.removeColumn);

/**
 * @swagger
 * /api/boards/{id}/columns/reorder:
 *   patch:
 *     summary: Reorder columns
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - columns
 *             properties:
 *               columns:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - columnId
 *                     - position
 *                   properties:
 *                     columnId:
 *                       type: string
 *                     position:
 *                       type: integer
 *                       minimum: 0
 *     responses:
 *       200:
 *         description: Columns reordered successfully
 *       404:
 *         description: Board not found
 *       403:
 *         description: Access denied
 */
router.patch('/:id/columns/reorder', validate(boardIdParamSchema, 'params'), validate(reorderColumnsSchema), boardController.reorderColumns);

// Member management routes
/**
 * @swagger
 * /api/boards/{id}/members:
 *   post:
 *     summary: Add member to board
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, member, viewer]
 *                 default: member
 *     responses:
 *       201:
 *         description: Member added successfully
 *       404:
 *         description: Board or user not found
 *       403:
 *         description: Access denied
 */
router.post('/:id/members', validate(boardIdParamSchema, 'params'), validate(addMemberSchema), boardController.addMember);

/**
 * @swagger
 * /api/boards/{id}/members/{userId}:
 *   patch:
 *     summary: Update member role
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, member, viewer]
 *     responses:
 *       200:
 *         description: Member role updated successfully
 *       404:
 *         description: Board or member not found
 *       403:
 *         description: Access denied
 */
router.patch('/:id/members/:userId', validate(memberIdParamSchema, 'params'), validate(updateMemberSchema), boardController.updateMemberRole);

/**
 * @swagger
 * /api/boards/{id}/members/{userId}:
 *   delete:
 *     summary: Remove member from board
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Member removed successfully
 *       404:
 *         description: Board or member not found
 *       403:
 *         description: Access denied
 */
router.delete('/:id/members/:userId', validate(memberIdParamSchema, 'params'), boardController.removeMember);

// Task movement routes
/**
 * @swagger
 * /api/boards/{id}/move-task:
 *   post:
 *     summary: Move existing task to board
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskId
 *               - targetColumnId
 *             properties:
 *               taskId:
 *                 type: string
 *                 description: Task ID to move
 *               targetColumnId:
 *                 type: string
 *                 description: Target column ID
 *               position:
 *                 type: number
 *                 minimum: 0
 *                 default: 0
 *                 description: Position in target column
 *     responses:
 *       200:
 *         description: Task moved to board successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Board, task or column not found
 *       403:
 *         description: Access denied
 */
router.post('/:id/move-task', validate(boardIdParamSchema, 'params'), validate(moveTaskToBoardSchema), boardController.moveTaskToBoard);

/**
 * @swagger
 * /api/boards/{id}/tasks/{taskId}/move:
 *   patch:
 *     summary: Move task within board
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sourceColumnId
 *               - targetColumnId
 *               - sourcePosition
 *               - targetPosition
 *             properties:
 *               sourceColumnId:
 *                 type: string
 *                 description: Source column ID
 *               targetColumnId:
 *                 type: string
 *                 description: Target column ID
 *               sourcePosition:
 *                 type: number
 *                 minimum: 0
 *                 description: Source position in column
 *               targetPosition:
 *                 type: number
 *                 minimum: 0
 *                 description: Target position in column
 *     responses:
 *       200:
 *         description: Task moved successfully
 *       400:
 *         description: Invalid request data or WIP limit reached
 *       404:
 *         description: Board, task or column not found
 *       403:
 *         description: Access denied
 */
router.patch('/:id/tasks/:taskId/move', validate(taskIdParamSchema, 'params'), validate(moveTaskSchema), boardController.moveTask);

/**
 * @swagger
 * /api/boards/{id}/bulk-move:
 *   patch:
 *     summary: Bulk move tasks for drag-and-drop reordering
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - moves
 *             properties:
 *               moves:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 50
 *                 items:
 *                   type: object
 *                   required:
 *                     - taskId
 *                     - sourceColumnId
 *                     - targetColumnId
 *                     - sourcePosition
 *                     - targetPosition
 *                   properties:
 *                     taskId:
 *                       type: string
 *                       description: Task ID to move
 *                     sourceColumnId:
 *                       type: string
 *                       description: Source column ID
 *                     targetColumnId:
 *                       type: string
 *                       description: Target column ID
 *                     sourcePosition:
 *                       type: number
 *                       minimum: 0
 *                       description: Source position in column
 *                     targetPosition:
 *                       type: number
 *                       minimum: 0
 *                       description: Target position in column
 *     responses:
 *       200:
 *         description: Tasks moved successfully
 *       400:
 *         description: Invalid request data or WIP limit reached
 *       404:
 *         description: Board or tasks not found
 *       403:
 *         description: Access denied
 */
router.patch('/:id/bulk-move', validate(boardIdParamSchema, 'params'), validate(bulkMoveTasksSchema), boardController.bulkMoveTasks);

/**
 * @swagger
 * /api/boards/{id}/columns/{columnId}/reorder-tasks:
 *   patch:
 *     summary: Reorder tasks within a column
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *       - in: path
 *         name: columnId
 *         required: true
 *         schema:
 *           type: string
 *         description: Column ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskOrder
 *             properties:
 *               taskOrder:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: string
 *                   description: Task ID in desired order
 *     responses:
 *       200:
 *         description: Tasks reordered successfully
 *       400:
 *         description: Invalid task order provided
 *       404:
 *         description: Board or column not found
 *       403:
 *         description: Access denied
 */
router.patch('/:id/columns/:columnId/reorder-tasks', validate(columnIdParamSchema, 'params'), validate(reorderTasksInColumnSchema), boardController.reorderTasksInColumn);

// Board sharing routes
/**
 * @swagger
 * /api/boards/{id}/invite:
 *   post:
 *     summary: Invite user to board
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to invite (required if userId not provided)
 *               userId:
 *                 type: string
 *                 description: User ID to invite (required if email not provided)
 *               role:
 *                 type: string
 *                 enum: [admin, member, viewer]
 *                 default: member
 *                 description: Role to assign to invited user
 *               message:
 *                 type: string
 *                 maxLength: 500
 *                 description: Optional message to include with invitation
 *               inviteType:
 *                 type: string
 *                 enum: [direct, email, link]
 *                 default: direct
 *                 description: Type of invitation
 *     responses:
 *       201:
 *         description: Invitation sent successfully
 *       400:
 *         description: Invalid request data or user already a member
 *       404:
 *         description: Board or user not found
 *       403:
 *         description: Access denied
 */
router.post('/:id/invite', validate(boardIdParamSchema, 'params'), validate(inviteToBoardSchema), boardController.inviteToBoard);

/**
 * @swagger
 * /api/boards/{id}/invitations:
 *   get:
 *     summary: Get board invitations
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of invitations per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, declined, expired, cancelled]
 *         description: Filter by invitation status
 *     responses:
 *       200:
 *         description: Board invitations retrieved successfully
 *       404:
 *         description: Board not found
 *       403:
 *         description: Access denied
 */
router.get('/:id/invitations', validate(boardIdParamSchema, 'params'), validate(getBoardInvitationsQuerySchema, 'query'), boardController.getBoardInvitations);

/**
 * @swagger
 * /api/boards/{id}/invitations/{invitationId}/cancel:
 *   patch:
 *     summary: Cancel board invitation
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *       - in: path
 *         name: invitationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Invitation ID
 *     responses:
 *       200:
 *         description: Invitation cancelled successfully
 *       400:
 *         description: Invitation cannot be cancelled
 *       404:
 *         description: Invitation not found
 *       403:
 *         description: Access denied
 */
router.patch('/:id/invitations/:invitationId/cancel', validate(invitationIdParamSchema, 'params'), boardController.cancelInvitation);

/**
 * @swagger
 * /api/boards/{id}/sharing-link:
 *   post:
 *     summary: Generate public sharing link
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, member, viewer]
 *                 default: viewer
 *                 description: Role for users joining via link
 *               expiresIn:
 *                 type: number
 *                 minimum: 1000
 *                 maximum: 2592000000
 *                 default: 604800000
 *                 description: Link expiration time in milliseconds (max 30 days)
 *     responses:
 *       200:
 *         description: Sharing link generated successfully
 *       404:
 *         description: Board not found
 *       403:
 *         description: Access denied
 */
router.post('/:id/sharing-link', validate(boardIdParamSchema, 'params'), validate(generateSharingLinkSchema), boardController.generateSharingLink);

/**
 * @swagger
 * /api/boards/{id}/permissions:
 *   patch:
 *     summary: Update board permissions and settings
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               visibility:
 *                 type: string
 *                 enum: [private, team, public]
 *                 description: Board visibility setting
 *               settings:
 *                 type: object
 *                 properties:
 *                   allowGuestView:
 *                     type: boolean
 *                     description: Allow guests to view the board
 *                   requireApprovalForJoin:
 *                     type: boolean
 *                     description: Require approval for join requests
 *                   defaultTaskPriority:
 *                     type: string
 *                     enum: [low, medium, high]
 *                     description: Default priority for new tasks
 *                   enableWipLimits:
 *                     type: boolean
 *                     description: Enable work-in-progress limits
 *                   autoArchiveCompleted:
 *                     type: boolean
 *                     description: Automatically archive completed tasks
 *                   autoArchiveDays:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 365
 *                     description: Days after which to auto-archive completed tasks
 *     responses:
 *       200:
 *         description: Board permissions updated successfully
 *       404:
 *         description: Board not found
 *       403:
 *         description: Access denied
 */
router.patch('/:id/permissions', validate(boardIdParamSchema, 'params'), validate(updateBoardPermissionsSchema), boardController.updateBoardPermissions);

module.exports = router;