'use strict';

const Board = require('../models/Board');
const Task = require('../models/Task');
const User = require('../models/User');
const mongoose = require('mongoose');
const websocketService = require('./websocketService');

class BoardService {
  /**
   * Create a new board
   * @param {Object} boardData - Board creation data
   * @param {String} userId - User creating the board
   * @returns {Promise<Object>} Created board
   */
  async createBoard(boardData, userId) {
    const session = await mongoose.startSession();

    try {
      await session.startTransaction();

      // Set the owner
      boardData.owner = userId;

      // Ensure columns have proper positions
      if (boardData.columns && boardData.columns.length > 0) {
        boardData.columns.forEach((column, index) => {
          if (column.position === undefined) {
            column.position = index;
          }
        });
        // Sort by position to maintain order
        boardData.columns.sort((a, b) => a.position - b.position);
      }

      const board = new Board(boardData);
      await board.save({ session });

      await session.commitTransaction();

      // Populate the board before returning
      await board.populate([
        { path: 'owner', select: 'username email' },
        { path: 'members.user', select: 'username email' }
      ]);

      // Emit real-time board creation event
      try {
        websocketService.emitBoardUpdate(board._id.toString(), {
          type: 'board_created',
          board: board
        }, userId);
      } catch (error) {
        console.error('Failed to emit board creation event:', error);
      }

      return {
        success: true,
        data: board,
        message: 'Board created successfully'
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get boards for a user
   * @param {String} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} List of boards with pagination
   */
  async getBoardsForUser(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      visibility = null,
      includeArchived = false,
      tags = [],
      search = null,
      sortBy = 'lastActivity',
      sortOrder = 'desc'
    } = options;

    const query = {
      $or: [
        { owner: userId },
        { 'members.user': userId }
      ]
    };

    if (!includeArchived) {
      query.isArchived = false;
    }

    if (visibility) {
      query.visibility = visibility;
    }

    if (tags.length > 0) {
      query.tags = { $in: Array.isArray(tags) ? tags : [tags] };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    const sortField = sortBy === 'lastActivity' ? 'stats.lastActivity' : sortBy;

    const skip = (page - 1) * limit;

    const [boards, total] = await Promise.all([
      Board.find(query)
        .populate('owner', 'username email')
        .populate('members.user', 'username email')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit),
      Board.countDocuments(query)
    ]);

    return {
      success: true,
      data: boards,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get board by ID
   * @param {String} boardId - Board ID
   * @param {String} userId - User ID requesting the board
   * @returns {Promise<Object>} Board data
   */
  async getBoardById(boardId, userId) {
    const board = await Board.findById(boardId)
      .populate('owner', 'username email')
      .populate('members.user', 'username email')
      .populate('members.addedBy', 'username email');

    if (!board) {
      return {
        success: false,
        error: 'Board not found',
        statusCode: 404
      };
    }

    // Check if user has access to view this board
    if (!board.canView(userId)) {
      return {
        success: false,
        error: 'Access denied',
        statusCode: 403
      };
    }

    // Get tasks for this board grouped by columns
    const tasks = await Task.find({
      boardId: boardId,
      isDeleted: false
    })
      .populate('assignedTo', 'username email')
      .populate('createdBy', 'username email')
      .sort({ columnId: 1, position: 1 });

    // Group tasks by column
    const tasksByColumn = {};
    board.columns.forEach(column => {
      tasksByColumn[column._id.toString()] = [];
    });

    tasks.forEach(task => {
      const columnId = task.columnId ? task.columnId.toString() : 'unassigned';
      if (tasksByColumn[columnId]) {
        tasksByColumn[columnId].push(task);
      } else {
        // Handle tasks in columns that no longer exist
        if (!tasksByColumn['unassigned']) {
          tasksByColumn['unassigned'] = [];
        }
        tasksByColumn['unassigned'].push(task);
      }
    });

    return {
      success: true,
      data: {
        ...board.toObject(),
        tasksByColumn
      }
    };
  }

  /**
   * Update board
   * @param {String} boardId - Board ID
   * @param {Object} updateData - Update data
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Updated board
   */
  async updateBoard(boardId, updateData, userId) {
    const board = await Board.findById(boardId);

    if (!board) {
      return {
        success: false,
        error: 'Board not found',
        statusCode: 404
      };
    }

    if (!board.canEdit(userId)) {
      return {
        success: false,
        error: 'Access denied',
        statusCode: 403
      };
    }

    Object.assign(board, updateData);
    await board.save();

    await board.populate([
      { path: 'owner', select: 'username email' },
      { path: 'members.user', select: 'username email' }
    ]);

    return {
      success: true,
      data: board,
      message: 'Board updated successfully'
    };
  }

  /**
   * Delete board
   * @param {String} boardId - Board ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteBoard(boardId, userId) {
    const session = await mongoose.startSession();

    try {
      await session.startTransaction();

      const board = await Board.findById(boardId).session(session);

      if (!board) {
        return {
          success: false,
          error: 'Board not found',
          statusCode: 404
        };
      }

      if (board.owner.toString() !== userId) {
        return {
          success: false,
          error: 'Only the board owner can delete the board',
          statusCode: 403
        };
      }

      // Check if there are any tasks in this board
      const taskCount = await Task.countDocuments({
        boardId: boardId,
        isDeleted: false
      }).session(session);

      if (taskCount > 0) {
        return {
          success: false,
          error: 'Cannot delete board with existing tasks. Please move or delete all tasks first.',
          statusCode: 400
        };
      }

      await Board.findByIdAndDelete(boardId).session(session);
      await session.commitTransaction();

      return {
        success: true,
        message: 'Board deleted successfully'
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Archive/Unarchive board
   * @param {String} boardId - Board ID
   * @param {Boolean} archived - Archive status
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Updated board
   */
  async archiveBoard(boardId, archived, userId) {
    const board = await Board.findById(boardId);

    if (!board) {
      return {
        success: false,
        error: 'Board not found',
        statusCode: 404
      };
    }

    if (!board.canEdit(userId)) {
      return {
        success: false,
        error: 'Access denied',
        statusCode: 403
      };
    }

    board.isArchived = archived;
    if (archived) {
      board.archivedAt = new Date();
      board.archivedBy = userId;
    } else {
      board.archivedAt = null;
      board.archivedBy = null;
    }

    await board.save();

    return {
      success: true,
      data: board,
      message: `Board ${archived ? 'archived' : 'unarchived'} successfully`
    };
  }

  /**
   * Add column to board
   * @param {String} boardId - Board ID
   * @param {Object} columnData - Column data
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Updated board
   */
  async addColumn(boardId, columnData, userId) {
    const board = await Board.findById(boardId);

    if (!board) {
      return {
        success: false,
        error: 'Board not found',
        statusCode: 404
      };
    }

    if (!board.canEdit(userId)) {
      return {
        success: false,
        error: 'Access denied',
        statusCode: 403
      };
    }

    await board.addColumn(columnData);

    // Emit real-time column added event
    try {
      websocketService.emitBoardUpdate(boardId, {
        type: 'column_added',
        board: board,
        column: columnData
      }, userId);
    } catch (error) {
      console.error('Failed to emit column added event:', error);
    }

    return {
      success: true,
      data: board,
      message: 'Column added successfully'
    };
  }

  /**
   * Update column
   * @param {String} boardId - Board ID
   * @param {String} columnId - Column ID
   * @param {Object} updateData - Update data
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Updated board
   */
  async updateColumn(boardId, columnId, updateData, userId) {
    const board = await Board.findById(boardId);

    if (!board) {
      return {
        success: false,
        error: 'Board not found',
        statusCode: 404
      };
    }

    if (!board.canEdit(userId)) {
      return {
        success: false,
        error: 'Access denied',
        statusCode: 403
      };
    }

    try {
      await board.updateColumn(columnId, updateData);

      return {
        success: true,
        data: board,
        message: 'Column updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: 400
      };
    }
  }

  /**
   * Remove column from board
   * @param {String} boardId - Board ID
   * @param {String} columnId - Column ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Updated board
   */
  async removeColumn(boardId, columnId, userId) {
    const session = await mongoose.startSession();

    try {
      await session.startTransaction();

      const board = await Board.findById(boardId).session(session);

      if (!board) {
        return {
          success: false,
          error: 'Board not found',
          statusCode: 404
        };
      }

      if (!board.canEdit(userId)) {
        return {
          success: false,
          error: 'Access denied',
          statusCode: 403
        };
      }

      // Check if column has any tasks
      const taskCount = await Task.countDocuments({
        boardId: boardId,
        columnId: columnId,
        isDeleted: false
      }).session(session);

      if (taskCount > 0) {
        return {
          success: false,
          error: 'Cannot delete column with existing tasks. Please move all tasks first.',
          statusCode: 400
        };
      }

      await board.removeColumn(columnId);
      await session.commitTransaction();

      // Emit real-time column removed event
      try {
        websocketService.emitBoardUpdate(boardId, {
          type: 'column_removed',
          board: board,
          columnId: columnId
        }, userId);
      } catch (error) {
        console.error('Failed to emit column removed event:', error);
      }

      return {
        success: true,
        data: board,
        message: 'Column removed successfully'
      };
    } catch (error) {
      await session.abortTransaction();
      if (error.message === 'Column not found') {
        return {
          success: false,
          error: error.message,
          statusCode: 404
        };
      }
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Reorder columns
   * @param {String} boardId - Board ID
   * @param {Array} columnUpdates - Array of {columnId, position}
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Updated board
   */
  async reorderColumns(boardId, columnUpdates, userId) {
    const board = await Board.findById(boardId);

    if (!board) {
      return {
        success: false,
        error: 'Board not found',
        statusCode: 404
      };
    }

    if (!board.canEdit(userId)) {
      return {
        success: false,
        error: 'Access denied',
        statusCode: 403
      };
    }

    // Update column positions
    columnUpdates.forEach(update => {
      const column = board.columns.id(update.columnId);
      if (column) {
        column.position = update.position;
      }
    });

    // Sort columns by position
    board.columns.sort((a, b) => a.position - b.position);

    await board.save();

    return {
      success: true,
      data: board,
      message: 'Columns reordered successfully'
    };
  }

  /**
   * Add member to board
   * @param {String} boardId - Board ID
   * @param {String} newUserId - User ID to add
   * @param {String} role - Member role
   * @param {String} userId - User ID making the request
   * @returns {Promise<Object>} Updated board
   */
  async addMember(boardId, newUserId, role, userId) {
    const board = await Board.findById(boardId);

    if (!board) {
      return {
        success: false,
        error: 'Board not found',
        statusCode: 404
      };
    }

    if (!board.canEdit(userId)) {
      return {
        success: false,
        error: 'Access denied',
        statusCode: 403
      };
    }

    // Check if user exists
    const userExists = await User.findById(newUserId);
    if (!userExists) {
      return {
        success: false,
        error: 'User not found',
        statusCode: 404
      };
    }

    try {
      await board.addMember(newUserId, role, userId);

      await board.populate([
        { path: 'owner', select: 'username email' },
        { path: 'members.user', select: 'username email' },
        { path: 'members.addedBy', select: 'username email' }
      ]);

      return {
        success: true,
        data: board,
        message: 'Member added successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: 400
      };
    }
  }

  /**
   * Remove member from board
   * @param {String} boardId - Board ID
   * @param {String} memberUserId - User ID to remove
   * @param {String} userId - User ID making the request
   * @returns {Promise<Object>} Updated board
   */
  async removeMember(boardId, memberUserId, userId) {
    const board = await Board.findById(boardId);

    if (!board) {
      return {
        success: false,
        error: 'Board not found',
        statusCode: 404
      };
    }

    if (!board.canEdit(userId)) {
      return {
        success: false,
        error: 'Access denied',
        statusCode: 403
      };
    }

    try {
      await board.removeMember(memberUserId);

      await board.populate([
        { path: 'owner', select: 'username email' },
        { path: 'members.user', select: 'username email' }
      ]);

      return {
        success: true,
        data: board,
        message: 'Member removed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: 400
      };
    }
  }

  /**
   * Update member role
   * @param {String} boardId - Board ID
   * @param {String} memberUserId - User ID to update
   * @param {String} newRole - New role
   * @param {String} userId - User ID making the request
   * @returns {Promise<Object>} Updated board
   */
  async updateMemberRole(boardId, memberUserId, newRole, userId) {
    const board = await Board.findById(boardId);

    if (!board) {
      return {
        success: false,
        error: 'Board not found',
        statusCode: 404
      };
    }

    if (!board.canEdit(userId)) {
      return {
        success: false,
        error: 'Access denied',
        statusCode: 403
      };
    }

    try {
      await board.updateMemberRole(memberUserId, newRole);

      await board.populate([
        { path: 'owner', select: 'username email' },
        { path: 'members.user', select: 'username email' }
      ]);

      return {
        success: true,
        data: board,
        message: 'Member role updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: 400
      };
    }
  }

  /**
   * Duplicate board
   * @param {String} boardId - Board ID to duplicate
   * @param {Object} options - Duplication options
   * @param {String} userId - User ID
   * @returns {Promise<Object>} New board
   */
  async duplicateBoard(boardId, options, userId) {
    const { title, includeTasks = false, includeMembers = false } = options;

    const originalBoard = await Board.findById(boardId);

    if (!originalBoard) {
      return {
        success: false,
        error: 'Board not found',
        statusCode: 404
      };
    }

    if (!originalBoard.canView(userId)) {
      return {
        success: false,
        error: 'Access denied',
        statusCode: 403
      };
    }

    const session = await mongoose.startSession();

    try {
      await session.startTransaction();

      // Create new board data
      const newBoardData = {
        title,
        description: originalBoard.description,
        columns: originalBoard.columns.map(col => ({
          title: col.title,
          position: col.position,
          color: col.color,
          wipLimit: col.wipLimit,
          isCollapsed: col.isCollapsed
        })),
        visibility: 'private', // Always create as private
        settings: originalBoard.settings,
        tags: [...originalBoard.tags],
        backgroundColor: originalBoard.backgroundColor,
        owner: userId
      };

      if (includeMembers && originalBoard.canEdit(userId)) {
        newBoardData.members = originalBoard.members
          .filter(member => member.user.toString() !== userId)
          .map(member => ({
            user: member.user,
            role: member.role,
            addedBy: userId
          }));
      }

      const newBoard = new Board(newBoardData);
      await newBoard.save({ session });

      // Copy tasks if requested
      if (includeTasks) {
        const originalTasks = await Task.find({
          boardId: boardId,
          isDeleted: false
        }).session(session);

        const taskPromises = originalTasks.map(async (task) => {
          const newTaskData = {
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate,
            labels: [...task.labels],
            subtasks: task.subtasks.map(sub => ({
              title: sub.title,
              status: sub.status
            })),
            attachments: [...task.attachments],
            boardId: newBoard._id,
            columnId: task.columnId,
            position: task.position,
            createdBy: userId
          };

          const newTask = new Task(newTaskData);
          return newTask.save({ session });
        });

        await Promise.all(taskPromises);
      }

      await session.commitTransaction();

      await newBoard.populate([
        { path: 'owner', select: 'username email' },
        { path: 'members.user', select: 'username email' }
      ]);

      return {
        success: true,
        data: newBoard,
        message: 'Board duplicated successfully'
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get public boards
   * @param {Object} options - Query options
   * @returns {Promise<Object>} List of public boards with pagination
   */
  async getPublicBoards(options = {}) {
    const {
      page = 1,
      limit = 20,
      tags = []
    } = options;

    const query = {
      visibility: 'public',
      isArchived: false
    };

    if (tags.length > 0) {
      query.tags = { $in: Array.isArray(tags) ? tags : [tags] };
    }

    const skip = (page - 1) * limit;

    const [boards, total] = await Promise.all([
      Board.find(query)
        .populate('owner', 'username email')
        .sort({ 'stats.lastActivity': -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Board.countDocuments(query)
    ]);

    return {
      success: true,
      data: boards,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get board statistics
   * @param {String} boardId - Board ID
   * @param {String} userId - User ID
   * @param {Object} options - Options for statistics
   * @returns {Promise<Object>} Board statistics
   */
  async getBoardStats(boardId, userId, options = {}) {
    const { period = 'month', startDate, endDate } = options;

    const board = await Board.findById(boardId);

    if (!board) {
      return {
        success: false,
        error: 'Board not found',
        statusCode: 404
      };
    }

    if (!board.canView(userId)) {
      return {
        success: false,
        error: 'Access denied',
        statusCode: 403
      };
    }

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else {
      const now = new Date();
      const periodStart = new Date();

      switch (period) {
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

      dateFilter.createdAt = { $gte: periodStart, $lte: now };
    }

    const baseQuery = { boardId: boardId, isDeleted: false };
    const periodQuery = { ...baseQuery, ...dateFilter };

    const [
      totalTasks,
      tasksByStatus,
      tasksByPriority,
      tasksByColumn,
      tasksByAssignee,
      recentActivity,
      completionRate
    ] = await Promise.all([
      Task.countDocuments(baseQuery),
      Task.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Task.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      Task.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$columnId', count: { $sum: 1 } } }
      ]),
      Task.aggregate([
        { $match: { ...baseQuery, assignedTo: { $ne: null } } },
        { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { _id: 1, count: 1, 'user.username': 1, 'user.email': 1 } }
      ]),
      Task.find(periodQuery)
        .select('title status createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .limit(10),
      Task.aggregate([
        { $match: periodQuery },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
          }
        }
      ])
    ]);

    const stats = {
      totalTasks,
      tasksByStatus: tasksByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      tasksByPriority: tasksByPriority.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      tasksByColumn: tasksByColumn.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      tasksByAssignee,
      recentActivity,
      completionRate: completionRate.length > 0 ?
        Math.round((completionRate[0].completed / completionRate[0].total) * 100) : 0,
      period,
      board: {
        id: board._id,
        title: board.title,
        memberCount: board.members.length,
        columnCount: board.columns.length
      }
    };

    return {
      success: true,
      data: stats
    };
  }

  /**
   * Move task to board and assign to column
   */
  async moveTaskToBoard(boardId, taskId, targetColumnId, position = 0, userId) {
    try {
      const board = await Board.findById(boardId);
      if (!board) {
        return { success: false, error: 'Board not found', statusCode: 404 };
      }

      if (!this.canUserAccessBoard(board, userId)) {
        return { success: false, error: 'Access denied', statusCode: 403 };
      }

      const targetColumn = board.columns.id(targetColumnId);
      if (!targetColumn) {
        return { success: false, error: 'Target column not found', statusCode: 404 };
      }

      const task = await Task.findById(taskId);
      if (!task) {
        return { success: false, error: 'Task not found', statusCode: 404 };
      }

      if (task.createdBy.toString() !== userId && !this.canUserManageBoard(board, userId)) {
        return { success: false, error: 'Access denied', statusCode: 403 };
      }

      // Remove task from current board if it's on one
      if (task.boardId && task.columnId) {
        const oldBoard = await Board.findById(task.boardId);
        if (oldBoard) {
          const oldColumn = oldBoard.columns.id(task.columnId);
          if (oldColumn) {
            const taskIndex = oldColumn.taskIds.indexOf(taskId);
            if (taskIndex > -1) {
              oldColumn.taskIds.splice(taskIndex, 1);
              await oldBoard.save();
            }
          }
        }
      }

      // Add task to new board and column
      targetColumn.taskIds.splice(position, 0, taskId);

      // Update task with board info
      task.boardId = boardId;
      task.columnId = targetColumnId;
      task.position = position;

      await Promise.all([task.save(), board.save()]);

      return { success: true, data: task, message: 'Task moved to board successfully' };
    } catch (error) {
      console.error('Move task to board error:', error);
      return { success: false, error: 'Failed to move task to board', statusCode: 500 };
    }
  }

  /**
   * Move task within board (between columns or within column)
   */
  async moveTask(boardId, taskId, sourceColumnId, targetColumnId, sourcePosition, targetPosition, userId) {
    try {
      const board = await Board.findById(boardId);
      if (!board) {
        return { success: false, error: 'Board not found', statusCode: 404 };
      }

      if (!this.canUserAccessBoard(board, userId)) {
        return { success: false, error: 'Access denied', statusCode: 403 };
      }

      const sourceColumn = board.columns.id(sourceColumnId);
      const targetColumn = board.columns.id(targetColumnId);

      if (!sourceColumn || !targetColumn) {
        return { success: false, error: 'Column not found', statusCode: 404 };
      }

      const task = await Task.findById(taskId);
      if (!task) {
        return { success: false, error: 'Task not found', statusCode: 404 };
      }

      if (task.createdBy.toString() !== userId && !this.canUserManageBoard(board, userId)) {
        return { success: false, error: 'Access denied', statusCode: 403 };
      }

      // Check WIP limits if moving to different column
      if (sourceColumnId !== targetColumnId && targetColumn.wipLimit) {
        if (targetColumn.taskIds.length >= targetColumn.wipLimit) {
          return { success: false, error: `Target column has reached WIP limit of ${targetColumn.wipLimit}`, statusCode: 400 };
        }
      }

      // Remove task from source column
      const taskIndex = sourceColumn.taskIds.indexOf(taskId);
      if (taskIndex > -1) {
        sourceColumn.taskIds.splice(taskIndex, 1);
      }

      // Add task to target column at specified position
      targetColumn.taskIds.splice(targetPosition, 0, taskId);

      // Update task properties
      task.columnId = targetColumnId;
      task.position = targetPosition;

      // Update task status based on column if it's a status column
      const statusMapping = {
        'To Do': 'pending',
        'In Progress': 'in-progress',
        'Done': 'completed',
        'Completed': 'completed'
      };

      if (statusMapping[targetColumn.title]) {
        task.status = statusMapping[targetColumn.title];
      }

      await Promise.all([task.save(), board.save()]);

      // Log activity
      await this.logBoardActivity(boardId, userId, 'task_moved', {
        taskId,
        taskTitle: task.title,
        fromColumn: sourceColumn.title,
        toColumn: targetColumn.title
      });

      return { success: true, data: task, message: 'Task moved successfully' };
    } catch (error) {
      console.error('Move task error:', error);
      return { success: false, error: 'Failed to move task', statusCode: 500 };
    }
  }

  /**
   * Bulk move tasks (for drag-and-drop reordering)
   */
  async bulkMoveTasks(boardId, moves, userId) {
    try {
      const board = await Board.findById(boardId);
      if (!board) {
        return { success: false, error: 'Board not found', statusCode: 404 };
      }

      if (!this.canUserAccessBoard(board, userId)) {
        return { success: false, error: 'Access denied', statusCode: 403 };
      }

      const tasks = await Task.find({
        _id: { $in: moves.map(m => m.taskId) },
        boardId: boardId
      });

      if (tasks.length !== moves.length) {
        return { success: false, error: 'Some tasks not found or not on this board', statusCode: 404 };
      }

      // Check permissions for all tasks
      for (const task of tasks) {
        if (task.createdBy.toString() !== userId && !this.canUserManageBoard(board, userId)) {
          return { success: false, error: 'Access denied for one or more tasks', statusCode: 403 };
        }
      }

      // Process moves in order
      for (const move of moves) {
        const sourceColumn = board.columns.id(move.sourceColumnId);
        const targetColumn = board.columns.id(move.targetColumnId);

        if (!sourceColumn || !targetColumn) {
          continue; // Skip invalid moves
        }

        // Check WIP limits
        if (move.sourceColumnId !== move.targetColumnId && targetColumn.wipLimit) {
          if (targetColumn.taskIds.length >= targetColumn.wipLimit) {
            return { success: false, error: `Column "${targetColumn.title}" has reached WIP limit`, statusCode: 400 };
          }
        }

        // Remove from source
        const taskIndex = sourceColumn.taskIds.indexOf(move.taskId);
        if (taskIndex > -1) {
          sourceColumn.taskIds.splice(taskIndex, 1);
        }

        // Add to target
        targetColumn.taskIds.splice(move.targetPosition, 0, move.taskId);

        // Update task
        const task = tasks.find(t => t._id.toString() === move.taskId);
        if (task) {
          task.columnId = move.targetColumnId;
          task.position = move.targetPosition;
        }
      }

      // Save all changes
      const savePromises = [board.save(), ...tasks.map(task => task.save())];
      await Promise.all(savePromises);

      return { success: true, data: { board, tasks }, message: 'Tasks moved successfully' };
    } catch (error) {
      console.error('Bulk move tasks error:', error);
      return { success: false, error: 'Failed to move tasks', statusCode: 500 };
    }
  }

  /**
   * Reorder tasks within a column
   */
  async reorderTasksInColumn(boardId, columnId, taskOrder, userId) {
    try {
      const board = await Board.findById(boardId);
      if (!board) {
        return { success: false, error: 'Board not found', statusCode: 404 };
      }

      if (!this.canUserAccessBoard(board, userId)) {
        return { success: false, error: 'Access denied', statusCode: 403 };
      }

      const column = board.columns.id(columnId);
      if (!column) {
        return { success: false, error: 'Column not found', statusCode: 404 };
      }

      // Validate that all provided task IDs are in the column
      const currentTaskIds = column.taskIds.map(id => id.toString());
      const newTaskIds = taskOrder.map(id => id.toString());

      if (currentTaskIds.length !== newTaskIds.length ||
          !currentTaskIds.every(id => newTaskIds.includes(id))) {
        return { success: false, error: 'Invalid task order provided', statusCode: 400 };
      }

      // Update column task order
      column.taskIds = taskOrder;

      // Update individual task positions
      const tasks = await Task.find({ _id: { $in: taskOrder }, columnId: columnId });
      const updatePromises = tasks.map((task, index) => {
        task.position = index;
        return task.save();
      });

      await Promise.all([board.save(), ...updatePromises]);

      return { success: true, data: column, message: 'Tasks reordered successfully' };
    } catch (error) {
      console.error('Reorder tasks error:', error);
      return { success: false, error: 'Failed to reorder tasks', statusCode: 500 };
    }
  }
}

module.exports = new BoardService();