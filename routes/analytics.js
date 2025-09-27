'use strict';

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  analyticsQuerySchema,
  boardAnalyticsParamSchema,
  exportAnalyticsQuerySchema,
  dashboardQuerySchema,
  productivityInsightsQuerySchema,
  collaborationMetricsQuerySchema,
  systemAnalyticsQuerySchema
} = require('../validations/analyticsSchemas');

// Apply authentication to all analytics routes
router.use(authMiddleware);

/**
 * @swagger
 * components:
 *   schemas:
 *     AnalyticsOverview:
 *       type: object
 *       properties:
 *         totalTasks:
 *           type: number
 *           description: Total number of tasks
 *         boardsCreated:
 *           type: number
 *           description: Number of boards created
 *         period:
 *           type: string
 *           description: Analysis period
 *         dateRange:
 *           type: object
 *           properties:
 *             start:
 *               type: string
 *               format: date-time
 *             end:
 *               type: string
 *               format: date-time
 *
 *     ProductivityMetrics:
 *       type: object
 *       properties:
 *         completionRate:
 *           type: number
 *           description: Task completion rate percentage
 *         avgDaysToComplete:
 *           type: number
 *           description: Average days to complete tasks
 *         totalCompleted:
 *           type: number
 *           description: Total completed tasks
 *         trends:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *               created:
 *                 type: number
 *               completed:
 *                 type: number
 *
 *     TaskBreakdown:
 *       type: object
 *       properties:
 *         byStatus:
 *           type: object
 *           additionalProperties:
 *             type: number
 *         byPriority:
 *           type: object
 *           additionalProperties:
 *             type: number
 */

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get analytics dashboard data
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: week
 *         description: Analysis period
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom period
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         overview:
 *                           $ref: '#/components/schemas/AnalyticsOverview'
 *                         productivity:
 *                           $ref: '#/components/schemas/ProductivityMetrics'
 *                     team:
 *                       type: object
 *                     period:
 *                       type: string
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Authentication required
 */
router.get('/dashboard', validate(dashboardQuerySchema, 'query'), analyticsController.getDashboard);

/**
 * @swagger
 * /api/analytics/user:
 *   get:
 *     summary: Get user analytics
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter, year]
 *           default: month
 *         description: Analysis period
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom period
 *     responses:
 *       200:
 *         description: User analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     overview:
 *                       $ref: '#/components/schemas/AnalyticsOverview'
 *                     taskBreakdown:
 *                       $ref: '#/components/schemas/TaskBreakdown'
 *                     productivity:
 *                       $ref: '#/components/schemas/ProductivityMetrics'
 *                     collaboration:
 *                       type: object
 *                     recentActivity:
 *                       type: array
 *       401:
 *         description: Authentication required
 */
router.get('/user', validate(analyticsQuerySchema, 'query'), analyticsController.getUserAnalytics);

/**
 * @swagger
 * /api/analytics/board/{boardId}:
 *   get:
 *     summary: Get board analytics
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter, year]
 *           default: month
 *         description: Analysis period
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom period
 *     responses:
 *       200:
 *         description: Board analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     board:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         memberCount:
 *                           type: number
 *                         columnCount:
 *                           type: number
 *                     overview:
 *                       type: object
 *                     workflow:
 *                       type: array
 *                     team:
 *                       type: object
 *                     trends:
 *                       type: object
 *       404:
 *         description: Board not found
 *       403:
 *         description: Access denied
 *       401:
 *         description: Authentication required
 */
router.get('/board/:boardId', validate(boardAnalyticsParamSchema, 'params'), validate(analyticsQuerySchema, 'query'), analyticsController.getBoardAnalytics);

/**
 * @swagger
 * /api/analytics/team:
 *   get:
 *     summary: Get team analytics
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter, year]
 *           default: month
 *         description: Analysis period
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom period
 *       - in: query
 *         name: teamId
 *         schema:
 *           type: string
 *         description: Team ID filter
 *     responses:
 *       200:
 *         description: Team analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     overview:
 *                       type: object
 *                     boards:
 *                       type: array
 *                     performance:
 *                       type: object
 *                     collaboration:
 *                       type: object
 *       401:
 *         description: Authentication required
 */
router.get('/team', validate(analyticsQuerySchema, 'query'), analyticsController.getTeamAnalytics);

/**
 * @swagger
 * /api/analytics/system:
 *   get:
 *     summary: Get system analytics (admin only)
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter, year]
 *           default: month
 *         description: Analysis period
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom period
 *       - in: query
 *         name: includeDetails
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include detailed metrics
 *     responses:
 *       200:
 *         description: System analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: object
 *                     tasks:
 *                       type: object
 *                     boards:
 *                       type: object
 *                     activity:
 *                       type: object
 *                     performance:
 *                       type: object
 *                     growth:
 *                       type: object
 *       403:
 *         description: Admin access required
 *       401:
 *         description: Authentication required
 */
router.get('/system', validate(systemAnalyticsQuerySchema, 'query'), analyticsController.getSystemAnalytics);

/**
 * @swagger
 * /api/analytics/productivity:
 *   get:
 *     summary: Get productivity insights and recommendations
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter]
 *           default: month
 *         description: Analysis period
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom period
 *       - in: query
 *         name: includeRecommendations
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include productivity recommendations
 *     responses:
 *       200:
 *         description: Productivity insights retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     productivity:
 *                       $ref: '#/components/schemas/ProductivityMetrics'
 *                     taskBreakdown:
 *                       $ref: '#/components/schemas/TaskBreakdown'
 *                     trends:
 *                       type: array
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                           priority:
 *                             type: string
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                           action:
 *                             type: string
 *       401:
 *         description: Authentication required
 */
router.get('/productivity', validate(productivityInsightsQuerySchema, 'query'), analyticsController.getProductivityInsights);

/**
 * @swagger
 * /api/analytics/collaboration:
 *   get:
 *     summary: Get collaboration metrics
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter]
 *           default: month
 *         description: Analysis period
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom period
 *       - in: query
 *         name: teamId
 *         schema:
 *           type: string
 *         description: Team ID filter
 *     responses:
 *       200:
 *         description: Collaboration metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     personal:
 *                       type: object
 *                     team:
 *                       type: object
 *                     performance:
 *                       type: object
 *                     boards:
 *                       type: array
 *       401:
 *         description: Authentication required
 */
router.get('/collaboration', validate(collaborationMetricsQuerySchema, 'query'), analyticsController.getCollaborationMetrics);

/**
 * @swagger
 * /api/analytics/export:
 *   get:
 *     summary: Export analytics data
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [user, team, board, system]
 *           default: user
 *         description: Type of analytics to export
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *         description: Export format
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter, year]
 *           default: month
 *         description: Analysis period
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom period
 *       - in: query
 *         name: boardId
 *         schema:
 *           type: string
 *         description: Board ID (required for board analytics)
 *     responses:
 *       200:
 *         description: Analytics data exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           text/csv:
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Authentication required
 */
router.get('/export', validate(exportAnalyticsQuerySchema, 'query'), analyticsController.exportAnalytics);

module.exports = router;