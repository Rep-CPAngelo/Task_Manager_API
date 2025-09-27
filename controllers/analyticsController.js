'use strict';

const analyticsService = require('../services/analyticsService');
const { sendResponse, sendError } = require('../utils/response');

class AnalyticsController {
  /**
   * Get user analytics
   */
  async getUserAnalytics(req, res) {
    try {
      const options = {
        period: req.query.period || 'month',
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const result = await analyticsService.getUserAnalytics(req.user.userId, options);

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, 'User analytics retrieved successfully');
    } catch (error) {
      console.error('Get user analytics error:', error);
      sendError(res, 'Failed to get user analytics', 500);
    }
  }

  /**
   * Get board analytics
   */
  async getBoardAnalytics(req, res) {
    try {
      const options = {
        period: req.query.period || 'month',
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const result = await analyticsService.getBoardAnalytics(
        req.params.boardId,
        req.user.userId,
        options
      );

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, 'Board analytics retrieved successfully');
    } catch (error) {
      console.error('Get board analytics error:', error);
      sendError(res, 'Failed to get board analytics', 500);
    }
  }

  /**
   * Get team analytics
   */
  async getTeamAnalytics(req, res) {
    try {
      const options = {
        period: req.query.period || 'month',
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        teamId: req.query.teamId
      };

      const result = await analyticsService.getTeamAnalytics(req.user.userId, options);

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, 'Team analytics retrieved successfully');
    } catch (error) {
      console.error('Get team analytics error:', error);
      sendError(res, 'Failed to get team analytics', 500);
    }
  }

  /**
   * Get system analytics (admin only)
   */
  async getSystemAnalytics(req, res) {
    try {
      const options = {
        period: req.query.period || 'month',
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const result = await analyticsService.getSystemAnalytics(req.user.userId, options);

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, 'System analytics retrieved successfully');
    } catch (error) {
      console.error('Get system analytics error:', error);
      sendError(res, 'Failed to get system analytics', 500);
    }
  }

  /**
   * Get analytics dashboard data
   */
  async getDashboard(req, res) {
    try {
      const options = {
        period: req.query.period || 'week',
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      // Get a summary of analytics for dashboard
      const [userAnalytics, teamAnalytics] = await Promise.all([
        analyticsService.getUserAnalytics(req.user.userId, options),
        analyticsService.getTeamAnalytics(req.user.userId, options)
      ]);

      if (!userAnalytics.success || !teamAnalytics.success) {
        return sendError(res, 'Failed to load dashboard data', 500);
      }

      const dashboardData = {
        user: {
          overview: userAnalytics.data.overview,
          productivity: userAnalytics.data.productivity,
          recentActivity: userAnalytics.data.recentActivity?.slice(0, 5) // Limit for dashboard
        },
        team: {
          overview: teamAnalytics.data.overview,
          boards: teamAnalytics.data.boards?.slice(0, 5), // Top 5 boards
          collaboration: teamAnalytics.data.collaboration
        },
        period: options.period,
        lastUpdated: new Date()
      };

      sendResponse(res, dashboardData, 'Dashboard data retrieved successfully');
    } catch (error) {
      console.error('Get dashboard error:', error);
      sendError(res, 'Failed to get dashboard data', 500);
    }
  }

  /**
   * Get productivity insights
   */
  async getProductivityInsights(req, res) {
    try {
      const options = {
        period: req.query.period || 'month',
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const result = await analyticsService.getUserAnalytics(req.user.userId, options);

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      // Extract productivity-focused insights
      const insights = {
        productivity: result.data.productivity,
        taskBreakdown: result.data.taskBreakdown,
        trends: this.generateProductivityTrends(result.data),
        recommendations: this.generateRecommendations(result.data),
        period: options.period
      };

      sendResponse(res, insights, 'Productivity insights retrieved successfully');
    } catch (error) {
      console.error('Get productivity insights error:', error);
      sendError(res, 'Failed to get productivity insights', 500);
    }
  }

  /**
   * Get collaboration metrics
   */
  async getCollaborationMetrics(req, res) {
    try {
      const options = {
        period: req.query.period || 'month',
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const [userAnalytics, teamAnalytics] = await Promise.all([
        analyticsService.getUserAnalytics(req.user.userId, options),
        analyticsService.getTeamAnalytics(req.user.userId, options)
      ]);

      if (!userAnalytics.success || !teamAnalytics.success) {
        return sendError(res, 'Failed to load collaboration data', 500);
      }

      const collaborationData = {
        personal: userAnalytics.data.collaboration,
        team: teamAnalytics.data.collaboration,
        performance: teamAnalytics.data.performance,
        boards: teamAnalytics.data.boards,
        period: options.period
      };

      sendResponse(res, collaborationData, 'Collaboration metrics retrieved successfully');
    } catch (error) {
      console.error('Get collaboration metrics error:', error);
      sendError(res, 'Failed to get collaboration metrics', 500);
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(req, res) {
    try {
      const { type = 'user', format = 'json', period = 'month' } = req.query;
      const options = {
        period,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      let result;
      switch (type) {
        case 'user':
          result = await analyticsService.getUserAnalytics(req.user.userId, options);
          break;
        case 'team':
          result = await analyticsService.getTeamAnalytics(req.user.userId, options);
          break;
        case 'board':
          if (!req.query.boardId) {
            return sendError(res, 'Board ID required for board analytics export', 400);
          }
          result = await analyticsService.getBoardAnalytics(req.query.boardId, req.user.userId, options);
          break;
        default:
          return sendError(res, 'Invalid analytics type', 400);
      }

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      if (format === 'csv') {
        // Convert to CSV format
        const csv = this.convertToCSV(result.data, type);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${type}-analytics-${period}.csv"`);
        res.send(csv);
      } else {
        // JSON format
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${type}-analytics-${period}.json"`);
        res.json({
          success: true,
          data: result.data,
          exportedAt: new Date(),
          type,
          period
        });
      }
    } catch (error) {
      console.error('Export analytics error:', error);
      sendError(res, 'Failed to export analytics', 500);
    }
  }

  // Helper methods

  generateProductivityTrends(data) {
    const trends = [];

    // Completion rate trend
    if (data.productivity && data.productivity.completionRate) {
      trends.push({
        metric: 'Completion Rate',
        value: data.productivity.completionRate,
        trend: data.productivity.completionRate >= 80 ? 'positive' :
               data.productivity.completionRate >= 60 ? 'neutral' : 'negative',
        description: `${data.productivity.completionRate}% of tasks completed`
      });
    }

    // Time to completion trend
    if (data.productivity && data.productivity.avgDaysToComplete) {
      trends.push({
        metric: 'Average Completion Time',
        value: data.productivity.avgDaysToComplete,
        trend: data.productivity.avgDaysToComplete <= 3 ? 'positive' :
               data.productivity.avgDaysToComplete <= 7 ? 'neutral' : 'negative',
        description: `${data.productivity.avgDaysToComplete} days average to complete tasks`
      });
    }

    return trends;
  }

  generateRecommendations(data) {
    const recommendations = [];

    // Based on completion rate
    if (data.productivity && data.productivity.completionRate < 70) {
      recommendations.push({
        type: 'productivity',
        priority: 'high',
        title: 'Improve Task Completion Rate',
        description: 'Consider breaking down large tasks into smaller, manageable subtasks',
        action: 'Review pending tasks and create subtasks'
      });
    }

    // Based on task distribution
    if (data.taskBreakdown && data.taskBreakdown.byPriority) {
      const highPriorityCount = data.taskBreakdown.byPriority.high || 0;
      const totalTasks = Object.values(data.taskBreakdown.byPriority).reduce((a, b) => a + b, 0);

      if (highPriorityCount / totalTasks > 0.5) {
        recommendations.push({
          type: 'prioritization',
          priority: 'medium',
          title: 'Review Task Priorities',
          description: 'High number of high-priority tasks may indicate over-prioritization',
          action: 'Review and adjust task priorities'
        });
      }
    }

    // Based on collaboration
    if (data.collaboration && data.collaboration.assignedTasks === 0) {
      recommendations.push({
        type: 'collaboration',
        priority: 'low',
        title: 'Increase Team Collaboration',
        description: 'Consider delegating tasks or working on shared projects',
        action: 'Join team boards or assign tasks to team members'
      });
    }

    return recommendations;
  }

  convertToCSV(data, type) {
    // This is a basic CSV conversion - could be enhanced based on specific needs
    const csvLines = [];

    // Add headers based on type
    switch (type) {
      case 'user':
        csvLines.push('Metric,Value,Period');
        csvLines.push(`Total Tasks,${data.overview?.totalTasks || 0},${data.overview?.period || 'N/A'}`);
        csvLines.push(`Boards Created,${data.overview?.boardsCreated || 0},${data.overview?.period || 'N/A'}`);
        csvLines.push(`Completion Rate,${data.productivity?.completionRate || 0}%,${data.overview?.period || 'N/A'}`);
        break;
      case 'team':
        csvLines.push('Board,Members,Tasks');
        if (data.boards) {
          data.boards.forEach(board => {
            csvLines.push(`${board.title},${board.memberCount},N/A`);
          });
        }
        break;
      default:
        csvLines.push('Data,Value');
        csvLines.push(`Export Type,${type}`);
    }

    return csvLines.join('\n');
  }
}

module.exports = new AnalyticsController();