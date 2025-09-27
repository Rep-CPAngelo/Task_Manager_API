'use strict';

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const performanceMonitor = require('../middleware/performanceMonitor');

/**
 * @swagger
 * components:
 *   schemas:
 *     PerformanceMetrics:
 *       type: object
 *       properties:
 *         requests:
 *           type: object
 *           properties:
 *             total:
 *               type: number
 *             byMethod:
 *               type: object
 *             byRoute:
 *               type: object
 *             byStatusCode:
 *               type: object
 *         responseTimes:
 *           type: object
 *           properties:
 *             avgResponseTime:
 *               type: number
 *             p95ResponseTime:
 *               type: number
 *             p99ResponseTime:
 *               type: number
 *             min:
 *               type: number
 *             max:
 *               type: number
 *         memory:
 *           type: object
 *           properties:
 *             heapUsed:
 *               type: number
 *             heapTotal:
 *               type: number
 *             external:
 *               type: number
 *             rss:
 *               type: number
 *         calculated:
 *           type: object
 *           properties:
 *             requestsPerSecond:
 *               type: number
 *             errorRate:
 *               type: number
 */

/**
 * @swagger
 * /api/performance/metrics:
 *   get:
 *     summary: Get performance metrics (admin only)
 *     tags: [Performance]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Performance metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PerformanceMetrics'
 *       403:
 *         description: Admin access required
 *       401:
 *         description: Authentication required
 */
router.get('/metrics', authMiddleware, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  const metrics = performanceMonitor.getMetrics();

  res.json({
    success: true,
    data: metrics,
    message: 'Performance metrics retrieved successfully'
  });
});

/**
 * @swagger
 * /api/performance/health:
 *   get:
 *     summary: Get performance health status
 *     tags: [Performance]
 *     responses:
 *       200:
 *         description: Health status retrieved successfully
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
 *                     status:
 *                       type: string
 *                       enum: [healthy, degraded, unhealthy]
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     uptime:
 *                       type: number
 *                     performance:
 *                       type: object
 *                     memory:
 *                       type: object
 *                     requests:
 *                       type: object
 */
router.get('/health', (req, res) => {
  const health = performanceMonitor.getHealthStatus();

  res.json({
    success: true,
    data: health,
    message: 'Performance health status retrieved successfully'
  });
});

/**
 * @swagger
 * /api/performance/reset:
 *   post:
 *     summary: Reset performance metrics (admin only)
 *     tags: [Performance]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Performance metrics reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       403:
 *         description: Admin access required
 *       401:
 *         description: Authentication required
 */
router.post('/reset', authMiddleware, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  performanceMonitor.reset();

  res.json({
    success: true,
    message: 'Performance metrics reset successfully'
  });
});

/**
 * @swagger
 * /api/performance/benchmark:
 *   get:
 *     summary: Get benchmark recommendations
 *     tags: [Performance]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Benchmark recommendations retrieved successfully
 */
router.get('/benchmark', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  const metrics = performanceMonitor.getMetrics();
  const recommendations = [];

  // Analyze metrics and provide recommendations
  if (metrics.calculated.avgResponseTime > 500) {
    recommendations.push({
      type: 'performance',
      priority: 'high',
      title: 'High Average Response Time',
      description: `Average response time is ${metrics.calculated.avgResponseTime}ms`,
      suggestion: 'Consider adding database indexes, implementing caching, or optimizing queries'
    });
  }

  if (metrics.calculated.errorRate > 2) {
    recommendations.push({
      type: 'reliability',
      priority: 'high',
      title: 'High Error Rate',
      description: `Error rate is ${metrics.calculated.errorRate}%`,
      suggestion: 'Review error logs and implement better error handling'
    });
  }

  if (metrics.memory.heapUsed > 256) {
    recommendations.push({
      type: 'memory',
      priority: 'medium',
      title: 'High Memory Usage',
      description: `Heap usage is ${metrics.memory.heapUsed}MB`,
      suggestion: 'Review memory leaks and optimize data structures'
    });
  }

  if (metrics.responseTimes.p95 > 1000) {
    recommendations.push({
      type: 'performance',
      priority: 'medium',
      title: 'High P95 Response Time',
      description: `P95 response time is ${metrics.responseTimes.p95}ms`,
      suggestion: 'Optimize slow endpoints and consider implementing timeouts'
    });
  }

  // Positive recommendations
  if (metrics.calculated.avgResponseTime < 100) {
    recommendations.push({
      type: 'positive',
      priority: 'info',
      title: 'Excellent Response Times',
      description: `Average response time is ${metrics.calculated.avgResponseTime}ms`,
      suggestion: 'Great performance! Consider monitoring trends to maintain this level'
    });
  }

  if (metrics.calculated.errorRate < 1) {
    recommendations.push({
      type: 'positive',
      priority: 'info',
      title: 'Low Error Rate',
      description: `Error rate is ${metrics.calculated.errorRate}%`,
      suggestion: 'Excellent reliability! Continue monitoring for any increases'
    });
  }

  res.json({
    success: true,
    data: {
      metrics: {
        avgResponseTime: metrics.calculated.avgResponseTime,
        p95ResponseTime: metrics.responseTimes.p95,
        p99ResponseTime: metrics.responseTimes.p99,
        errorRate: metrics.calculated.errorRate,
        requestsPerSecond: metrics.calculated.requestsPerSecond,
        memoryUsage: metrics.memory.heapUsed
      },
      recommendations,
      benchmarks: {
        responseTime: {
          excellent: '< 100ms',
          good: '< 300ms',
          acceptable: '< 1000ms',
          poor: '> 1000ms'
        },
        errorRate: {
          excellent: '< 0.1%',
          good: '< 1%',
          acceptable: '< 5%',
          poor: '> 5%'
        },
        memory: {
          excellent: '< 128MB',
          good: '< 256MB',
          acceptable: '< 512MB',
          poor: '> 512MB'
        }
      }
    },
    message: 'Performance benchmark recommendations retrieved successfully'
  });
});

module.exports = router;