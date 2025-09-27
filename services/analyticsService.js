'use strict';

const Task = require('../models/Task');
const Board = require('../models/Board');
const User = require('../models/User');
const TaskActivity = require('../models/TaskActivity');

class AnalyticsService {
  /**
   * Get user analytics overview
   */
  async getUserAnalytics(userId, options = {}) {
    try {
      const { period = 'month', startDate, endDate } = options;

      // Calculate date range
      const dateFilter = this.getDateFilter(period, startDate, endDate);

      // Parallel queries for better performance
      const [
        totalTasks,
        tasksByStatus,
        tasksByPriority,
        completedTasksOverTime,
        productivityMetrics,
        recentActivity,
        boardsCreated,
        collaborationStats
      ] = await Promise.all([
        // Total tasks created by user
        Task.countDocuments({ createdBy: userId, ...dateFilter }),

        // Tasks by status
        Task.aggregate([
          { $match: { createdBy: userId, ...dateFilter } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),

        // Tasks by priority
        Task.aggregate([
          { $match: { createdBy: userId, ...dateFilter } },
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ]),

        // Completed tasks over time
        Task.aggregate([
          {
            $match: {
              createdBy: userId,
              status: 'completed',
              completedAt: dateFilter.createdAt || { $exists: true }
            }
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: this.getDateFormat(period),
                  date: '$completedAt'
                }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id': 1 } }
        ]),

        // Productivity metrics
        this.calculateProductivityMetrics(userId, dateFilter),

        // Recent activity
        TaskActivity.find({
          $or: [
            { userId: userId },
            { 'task.createdBy': userId }
          ],
          ...dateFilter
        })
          .populate('task', 'title status priority')
          .sort({ createdAt: -1 })
          .limit(10),

        // Boards created
        Board.countDocuments({ owner: userId, ...dateFilter }),

        // Collaboration stats
        this.getCollaborationStats(userId, dateFilter)
      ]);

      return {
        success: true,
        data: {
          overview: {
            totalTasks,
            boardsCreated,
            period: period,
            dateRange: this.getDateRangeInfo(period, startDate, endDate)
          },
          taskBreakdown: {
            byStatus: this.formatGroupedData(tasksByStatus),
            byPriority: this.formatGroupedData(tasksByPriority)
          },
          productivity: {
            completedOverTime: completedTasksOverTime,
            metrics: productivityMetrics
          },
          collaboration: collaborationStats,
          recentActivity: recentActivity
        }
      };
    } catch (error) {
      console.error('Get user analytics error:', error);
      return { success: false, error: 'Failed to get user analytics', statusCode: 500 };
    }
  }

  /**
   * Get board analytics
   */
  async getBoardAnalytics(boardId, userId, options = {}) {
    try {
      const { period = 'month', startDate, endDate } = options;

      // Verify user has access to board
      const board = await Board.findById(boardId);
      if (!board) {
        return { success: false, error: 'Board not found', statusCode: 404 };
      }

      if (!board.canView(userId)) {
        return { success: false, error: 'Access denied', statusCode: 403 };
      }

      const dateFilter = this.getDateFilter(period, startDate, endDate);

      const [
        taskStats,
        memberActivity,
        columnStats,
        velocityData,
        burndownData,
        teamProductivity
      ] = await Promise.all([
        // Basic task statistics
        this.getBoardTaskStats(boardId, dateFilter),

        // Member activity and contributions
        this.getBoardMemberActivity(boardId, dateFilter),

        // Column/workflow analytics
        this.getBoardColumnStats(boardId, dateFilter),

        // Velocity tracking
        this.getBoardVelocity(boardId, period),

        // Burndown chart data
        this.getBurndownData(boardId, dateFilter),

        // Team productivity metrics
        this.getTeamProductivity(boardId, dateFilter)
      ]);

      return {
        success: true,
        data: {
          board: {
            id: board._id,
            title: board.title,
            memberCount: board.members.length,
            columnCount: board.columns.length
          },
          overview: taskStats,
          workflow: columnStats,
          team: {
            memberActivity,
            productivity: teamProductivity
          },
          trends: {
            velocity: velocityData,
            burndown: burndownData
          },
          period: period,
          dateRange: this.getDateRangeInfo(period, startDate, endDate)
        }
      };
    } catch (error) {
      console.error('Get board analytics error:', error);
      return { success: false, error: 'Failed to get board analytics', statusCode: 500 };
    }
  }

  /**
   * Get team/organization analytics
   */
  async getTeamAnalytics(userId, options = {}) {
    try {
      const { period = 'month', startDate, endDate, teamId } = options;

      // For now, get analytics for all boards user has access to
      // In future, this could be filtered by team/organization
      const userBoards = await Board.find({
        $or: [
          { owner: userId },
          { 'members.user': userId }
        ]
      }).select('_id title members');

      const boardIds = userBoards.map(board => board._id);
      const dateFilter = this.getDateFilter(period, startDate, endDate);

      const [
        teamOverview,
        crossBoardMetrics,
        memberPerformance,
        workloadDistribution,
        collaborationMetrics
      ] = await Promise.all([
        // Team overview stats
        this.getTeamOverview(boardIds, dateFilter),

        // Cross-board metrics
        this.getCrossBoardMetrics(boardIds, dateFilter),

        // Individual member performance
        this.getMemberPerformance(boardIds, dateFilter),

        // Workload distribution
        this.getWorkloadDistribution(boardIds, dateFilter),

        // Collaboration patterns
        this.getCollaborationMetrics(boardIds, dateFilter)
      ]);

      return {
        success: true,
        data: {
          overview: teamOverview,
          boards: userBoards.map(board => ({
            id: board._id,
            title: board.title,
            memberCount: board.members.length
          })),
          performance: {
            crossBoard: crossBoardMetrics,
            members: memberPerformance,
            workload: workloadDistribution
          },
          collaboration: collaborationMetrics,
          period: period,
          dateRange: this.getDateRangeInfo(period, startDate, endDate)
        }
      };
    } catch (error) {
      console.error('Get team analytics error:', error);
      return { success: false, error: 'Failed to get team analytics', statusCode: 500 };
    }
  }

  /**
   * Get system-wide analytics (admin only)
   */
  async getSystemAnalytics(userId, options = {}) {
    try {
      // Verify user is admin
      const user = await User.findById(userId);
      if (!user || user.role !== 'admin') {
        return { success: false, error: 'Admin access required', statusCode: 403 };
      }

      const { period = 'month', startDate, endDate } = options;
      const dateFilter = this.getDateFilter(period, startDate, endDate);

      const [
        userStats,
        taskStats,
        boardStats,
        activityStats,
        performanceMetrics,
        growthMetrics
      ] = await Promise.all([
        // User statistics
        this.getSystemUserStats(dateFilter),

        // Task statistics
        this.getSystemTaskStats(dateFilter),

        // Board statistics
        this.getSystemBoardStats(dateFilter),

        // Activity statistics
        this.getSystemActivityStats(dateFilter),

        // Performance metrics
        this.getSystemPerformanceMetrics(dateFilter),

        // Growth metrics
        this.getGrowthMetrics(period)
      ]);

      return {
        success: true,
        data: {
          users: userStats,
          tasks: taskStats,
          boards: boardStats,
          activity: activityStats,
          performance: performanceMetrics,
          growth: growthMetrics,
          period: period,
          dateRange: this.getDateRangeInfo(period, startDate, endDate)
        }
      };
    } catch (error) {
      console.error('Get system analytics error:', error);
      return { success: false, error: 'Failed to get system analytics', statusCode: 500 };
    }
  }

  // Helper methods

  getDateFilter(period, startDate, endDate) {
    if (startDate && endDate) {
      return {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const now = new Date();
    const periodStart = new Date();

    switch (period) {
      case 'day':
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'week':
        periodStart.setDate(now.getDate() - 7);
        break;
      case 'month':
        periodStart.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        periodStart.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        periodStart.setFullYear(now.getFullYear() - 1);
        break;
      default:
        periodStart.setMonth(now.getMonth() - 1);
    }

    return {
      createdAt: {
        $gte: periodStart,
        $lte: now
      }
    };
  }

  getDateFormat(period) {
    switch (period) {
      case 'day':
        return '%Y-%m-%d %H:00';
      case 'week':
      case 'month':
        return '%Y-%m-%d';
      case 'quarter':
      case 'year':
        return '%Y-%m';
      default:
        return '%Y-%m-%d';
    }
  }

  getDateRangeInfo(period, startDate, endDate) {
    if (startDate && endDate) {
      return {
        start: new Date(startDate),
        end: new Date(endDate),
        custom: true
      };
    }

    const now = new Date();
    const periodStart = new Date();

    switch (period) {
      case 'day':
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'week':
        periodStart.setDate(now.getDate() - 7);
        break;
      case 'month':
        periodStart.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        periodStart.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        periodStart.setFullYear(now.getFullYear() - 1);
        break;
    }

    return {
      start: periodStart,
      end: now,
      custom: false
    };
  }

  formatGroupedData(aggregateResult) {
    return aggregateResult.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
  }

  async calculateProductivityMetrics(userId, dateFilter) {
    const [taskCompletionRate, avgTimeToComplete, taskTrends] = await Promise.all([
      // Task completion rate
      Task.aggregate([
        { $match: { createdBy: userId, ...dateFilter } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
          }
        }
      ]),

      // Average time to complete tasks
      Task.aggregate([
        {
          $match: {
            createdBy: userId,
            status: 'completed',
            completedAt: { $exists: true },
            ...dateFilter
          }
        },
        {
          $project: {
            timeToComplete: {
              $divide: [
                { $subtract: ['$completedAt', '$createdAt'] },
                1000 * 60 * 60 * 24 // Convert to days
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgDays: { $avg: '$timeToComplete' },
            count: { $sum: 1 }
          }
        }
      ]),

      // Task creation trends
      Task.aggregate([
        { $match: { createdBy: userId, ...dateFilter } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            created: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
          }
        },
        { $sort: { '_id': 1 } }
      ])
    ]);

    const completionRate = taskCompletionRate[0]
      ? Math.round((taskCompletionRate[0].completed / taskCompletionRate[0].total) * 100)
      : 0;

    const avgDaysToComplete = avgTimeToComplete[0]
      ? Math.round(avgTimeToComplete[0].avgDays * 10) / 10
      : 0;

    return {
      completionRate,
      avgDaysToComplete,
      totalCompleted: avgTimeToComplete[0]?.count || 0,
      trends: taskTrends
    };
  }

  async getCollaborationStats(userId, dateFilter) {
    const [assignedTasks, collaborativeBoards, teamInteractions] = await Promise.all([
      // Tasks assigned to user by others
      Task.countDocuments({
        assignedTo: userId,
        createdBy: { $ne: userId },
        ...dateFilter
      }),

      // Boards where user is a member (not owner)
      Board.countDocuments({
        'members.user': userId,
        owner: { $ne: userId }
      }),

      // Recent activities on user's tasks by others
      TaskActivity.countDocuments({
        'task.createdBy': userId,
        userId: { $ne: userId },
        ...dateFilter
      })
    ]);

    return {
      assignedTasks,
      collaborativeBoards,
      teamInteractions
    };
  }

  async getBoardTaskStats(boardId, dateFilter) {
    const [totalTasks, tasksByStatus, tasksByPriority, recentlyCompleted] = await Promise.all([
      Task.countDocuments({ boardId, ...dateFilter }),

      Task.aggregate([
        { $match: { boardId, ...dateFilter } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      Task.aggregate([
        { $match: { boardId, ...dateFilter } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),

      Task.countDocuments({
        boardId,
        status: 'completed',
        completedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
    ]);

    return {
      total: totalTasks,
      byStatus: this.formatGroupedData(tasksByStatus),
      byPriority: this.formatGroupedData(tasksByPriority),
      recentlyCompleted
    };
  }

  async getBoardMemberActivity(boardId, dateFilter) {
    return await TaskActivity.aggregate([
      {
        $lookup: {
          from: 'tasks',
          localField: 'task',
          foreignField: '_id',
          as: 'taskInfo'
        }
      },
      {
        $match: {
          'taskInfo.boardId': boardId,
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$userId',
          activityCount: { $sum: 1 },
          lastActivity: { $max: '$createdAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          user: { $arrayElemAt: ['$user', 0] },
          activityCount: 1,
          lastActivity: 1
        }
      },
      { $sort: { activityCount: -1 } }
    ]);
  }

  async getBoardColumnStats(boardId, dateFilter) {
    const board = await Board.findById(boardId);
    if (!board) return {};

    const columnStats = await Promise.all(
      board.columns.map(async (column) => {
        const taskCount = await Task.countDocuments({
          boardId,
          columnId: column._id,
          ...dateFilter
        });

        return {
          id: column._id,
          title: column.title,
          taskCount,
          wipLimit: column.wipLimit,
          utilizationRate: column.wipLimit
            ? Math.round((taskCount / column.wipLimit) * 100)
            : null
        };
      })
    );

    return columnStats;
  }

  async getBoardVelocity(boardId, period) {
    const periods = this.getVelocityPeriods(period, 6); // Last 6 periods

    const velocityData = await Promise.all(
      periods.map(async ({ start, end, label }) => {
        const completed = await Task.countDocuments({
          boardId,
          status: 'completed',
          completedAt: { $gte: start, $lte: end }
        });

        return { period: label, completed };
      })
    );

    return velocityData;
  }

  async getBurndownData(boardId, dateFilter) {
    // This is a simplified burndown - could be enhanced with sprint planning
    const tasks = await Task.aggregate([
      { $match: { boardId, ...dateFilter } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          created: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    let remainingTasks = 0;
    return tasks.map(day => {
      remainingTasks += day.created - day.completed;
      return {
        date: day._id,
        remaining: Math.max(0, remainingTasks),
        created: day.created,
        completed: day.completed
      };
    });
  }

  async getTeamProductivity(boardId, dateFilter) {
    return await Task.aggregate([
      { $match: { boardId, ...dateFilter } },
      {
        $group: {
          _id: '$assignedTo',
          tasksAssigned: { $sum: 1 },
          tasksCompleted: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          user: { $arrayElemAt: ['$user', 0] },
          tasksAssigned: 1,
          tasksCompleted: 1,
          completionRate: {
            $cond: [
              { $eq: ['$tasksAssigned', 0] },
              0,
              { $multiply: [{ $divide: ['$tasksCompleted', '$tasksAssigned'] }, 100] }
            ]
          }
        }
      },
      { $sort: { completionRate: -1 } }
    ]);
  }

  getVelocityPeriods(period, count) {
    const periods = [];
    const now = new Date();

    for (let i = count - 1; i >= 0; i--) {
      const end = new Date(now);
      const start = new Date(now);

      switch (period) {
        case 'week':
          start.setDate(now.getDate() - (i + 1) * 7);
          end.setDate(now.getDate() - i * 7);
          break;
        case 'month':
          start.setMonth(now.getMonth() - (i + 1));
          end.setMonth(now.getMonth() - i);
          break;
        default:
          start.setDate(now.getDate() - (i + 1) * 7);
          end.setDate(now.getDate() - i * 7);
      }

      periods.push({
        start,
        end,
        label: this.formatPeriodLabel(start, period)
      });
    }

    return periods;
  }

  formatPeriodLabel(date, period) {
    const options = period === 'month'
      ? { year: 'numeric', month: 'short' }
      : { month: 'short', day: 'numeric' };

    return date.toLocaleDateString('en-US', options);
  }

  // Placeholder methods for complex analytics (to be implemented)
  async getTeamOverview(boardIds, dateFilter) { return {}; }
  async getCrossBoardMetrics(boardIds, dateFilter) { return {}; }
  async getMemberPerformance(boardIds, dateFilter) { return []; }
  async getWorkloadDistribution(boardIds, dateFilter) { return {}; }
  async getCollaborationMetrics(boardIds, dateFilter) { return {}; }
  async getSystemUserStats(dateFilter) { return {}; }
  async getSystemTaskStats(dateFilter) { return {}; }
  async getSystemBoardStats(dateFilter) { return {}; }
  async getSystemActivityStats(dateFilter) { return {}; }
  async getSystemPerformanceMetrics(dateFilter) { return {}; }
  async getGrowthMetrics(period) { return {}; }
}

module.exports = new AnalyticsService();