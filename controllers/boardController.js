'use strict';

const boardService = require('../services/boardService');
const boardSharingService = require('../services/boardSharingService');
const { sendResponse, sendError } = require('../utils/response');

class BoardController {
  /**
   * Create a new board
   */
  async createBoard(req, res) {
    try {
      const result = await boardService.createBoard(req.body, req.user.userId);

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, result.message, 201);
    } catch (error) {
      console.error('Create board error:', error);
      sendError(res, 'Failed to create board', 500);
    }
  }

  /**
   * Get boards for the authenticated user
   */
  async getBoards(req, res) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        visibility: req.query.visibility,
        includeArchived: req.query.includeArchived === 'true',
        tags: req.query.tags ? (Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags]) : [],
        search: req.query.search,
        sortBy: req.query.sortBy || 'lastActivity',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await boardService.getBoardsForUser(req.user.userId, options);

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, 'Boards retrieved successfully', 200, result.pagination);
    } catch (error) {
      console.error('Get boards error:', error);
      sendError(res, 'Failed to retrieve boards', 500);
    }
  }

  /**
   * Get board by ID
   */
  async getBoardById(req, res) {
    try {
      const result = await boardService.getBoardById(req.params.id, req.user.userId);

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, 'Board retrieved successfully');
    } catch (error) {
      console.error('Get board by ID error:', error);
      sendError(res, 'Failed to retrieve board', 500);
    }
  }

  /**
   * Update board
   */
  async updateBoard(req, res) {
    try {
      const result = await boardService.updateBoard(req.params.id, req.body, req.user.userId);

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, result.message);
    } catch (error) {
      console.error('Update board error:', error);
      sendError(res, 'Failed to update board', 500);
    }
  }

  /**
   * Delete board
   */
  async deleteBoard(req, res) {
    try {
      const result = await boardService.deleteBoard(req.params.id, req.user.userId);

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, null, result.message);
    } catch (error) {
      console.error('Delete board error:', error);
      sendError(res, 'Failed to delete board', 500);
    }
  }

  /**
   * Archive/Unarchive board
   */
  async archiveBoard(req, res) {
    try {
      const { archived } = req.body;
      const result = await boardService.archiveBoard(req.params.id, archived, req.user.userId);

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, result.message);
    } catch (error) {
      console.error('Archive board error:', error);
      sendError(res, 'Failed to archive board', 500);
    }
  }

  /**
   * Add column to board
   */
  async addColumn(req, res) {
    try {
      const result = await boardService.addColumn(req.params.id, req.body, req.user.userId);

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, result.message, 201);
    } catch (error) {
      console.error('Add column error:', error);
      sendError(res, 'Failed to add column', 500);
    }
  }

  /**
   * Update column
   */
  async updateColumn(req, res) {
    try {
      const result = await boardService.updateColumn(
        req.params.id,
        req.params.columnId,
        req.body,
        req.user.userId
      );

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, result.message);
    } catch (error) {
      console.error('Update column error:', error);
      sendError(res, 'Failed to update column', 500);
    }
  }

  /**
   * Remove column from board
   */
  async removeColumn(req, res) {
    try {
      const result = await boardService.removeColumn(
        req.params.id,
        req.params.columnId,
        req.user.userId
      );

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, result.message);
    } catch (error) {
      console.error('Remove column error:', error);
      sendError(res, 'Failed to remove column', 500);
    }
  }

  /**
   * Reorder columns
   */
  async reorderColumns(req, res) {
    try {
      const { columns } = req.body;
      const result = await boardService.reorderColumns(req.params.id, columns, req.user.userId);

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, result.message);
    } catch (error) {
      console.error('Reorder columns error:', error);
      sendError(res, 'Failed to reorder columns', 500);
    }
  }

  /**
   * Add member to board
   */
  async addMember(req, res) {
    try {
      const { userId, role } = req.body;
      const result = await boardService.addMember(req.params.id, userId, role, req.user.userId);

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, result.message, 201);
    } catch (error) {
      console.error('Add member error:', error);
      sendError(res, 'Failed to add member', 500);
    }
  }

  /**
   * Remove member from board
   */
  async removeMember(req, res) {
    try {
      const result = await boardService.removeMember(
        req.params.id,
        req.params.userId,
        req.user.userId
      );

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, result.message);
    } catch (error) {
      console.error('Remove member error:', error);
      sendError(res, 'Failed to remove member', 500);
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(req, res) {
    try {
      const { role } = req.body;
      const result = await boardService.updateMemberRole(
        req.params.id,
        req.params.userId,
        role,
        req.user.userId
      );

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, result.message);
    } catch (error) {
      console.error('Update member role error:', error);
      sendError(res, 'Failed to update member role', 500);
    }
  }

  /**
   * Duplicate board
   */
  async duplicateBoard(req, res) {
    try {
      const result = await boardService.duplicateBoard(req.params.id, req.body, req.user.userId);

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, result.message, 201);
    } catch (error) {
      console.error('Duplicate board error:', error);
      sendError(res, 'Failed to duplicate board', 500);
    }
  }

  /**
   * Get public boards
   */
  async getPublicBoards(req, res) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        tags: req.query.tags ? (Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags]) : []
      };

      const result = await boardService.getPublicBoards(options);

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, 'Public boards retrieved successfully', 200, result.pagination);
    } catch (error) {
      console.error('Get public boards error:', error);
      sendError(res, 'Failed to retrieve public boards', 500);
    }
  }

  /**
   * Get board statistics
   */
  async getBoardStats(req, res) {
    try {
      const options = {
        period: req.query.period || 'month',
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const result = await boardService.getBoardStats(req.params.id, req.user.userId, options);

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, 'Board statistics retrieved successfully');
    } catch (error) {
      console.error('Get board stats error:', error);
      sendError(res, 'Failed to retrieve board statistics', 500);
    }
  }

  /**
   * Move task to board
   */
  async moveTaskToBoard(req, res) {
    try {
      const { taskId, targetColumnId, position } = req.body;
      const result = await boardService.moveTaskToBoard(
        req.params.id,
        taskId,
        targetColumnId,
        position,
        req.user.userId
      );

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, result.message);
    } catch (error) {
      console.error('Move task to board error:', error);
      sendError(res, 'Failed to move task to board', 500);
    }
  }

  /**
   * Move task within board
   */
  async moveTask(req, res) {
    try {
      const { sourceColumnId, targetColumnId, sourcePosition, targetPosition } = req.body;
      const result = await boardService.moveTask(
        req.params.id,
        req.params.taskId,
        sourceColumnId,
        targetColumnId,
        sourcePosition,
        targetPosition,
        req.user.userId
      );

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, result.message);
    } catch (error) {
      console.error('Move task error:', error);
      sendError(res, 'Failed to move task', 500);
    }
  }

  /**
   * Bulk move tasks
   */
  async bulkMoveTasks(req, res) {
    try {
      const { moves } = req.body;
      const result = await boardService.bulkMoveTasks(req.params.id, moves, req.user.userId);

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, result.message);
    } catch (error) {
      console.error('Bulk move tasks error:', error);
      sendError(res, 'Failed to move tasks', 500);
    }
  }

  /**
   * Reorder tasks within column
   */
  async reorderTasksInColumn(req, res) {
    try {
      const { taskOrder } = req.body;
      const result = await boardService.reorderTasksInColumn(
        req.params.id,
        req.params.columnId,
        taskOrder,
        req.user.userId
      );

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, result.message);
    } catch (error) {
      console.error('Reorder tasks error:', error);
      sendError(res, 'Failed to reorder tasks', 500);
    }
  }

  // Board sharing methods

  /**
   * Invite user to board
   */
  async inviteToBoard(req, res) {
    try {
      const metadata = {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      };

      const result = await boardSharingService.inviteToBoard(
        req.params.id,
        req.user.userId,
        req.body,
        metadata
      );

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, result.message, 201);
    } catch (error) {
      console.error('Invite to board error:', error);
      sendError(res, 'Failed to send invitation', 500);
    }
  }

  /**
   * Accept board invitation
   */
  async acceptInvitation(req, res) {
    try {
      const result = await boardSharingService.acceptInvitation(
        req.params.token,
        req.user.userId
      );

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, result.message);
    } catch (error) {
      console.error('Accept invitation error:', error);
      sendError(res, 'Failed to accept invitation', 500);
    }
  }

  /**
   * Decline board invitation
   */
  async declineInvitation(req, res) {
    try {
      const result = await boardSharingService.declineInvitation(
        req.params.token,
        req.user.userId
      );

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, null, result.message);
    } catch (error) {
      console.error('Decline invitation error:', error);
      sendError(res, 'Failed to decline invitation', 500);
    }
  }

  /**
   * Cancel board invitation
   */
  async cancelInvitation(req, res) {
    try {
      const result = await boardSharingService.cancelInvitation(
        req.params.invitationId,
        req.user.userId
      );

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, null, result.message);
    } catch (error) {
      console.error('Cancel invitation error:', error);
      sendError(res, 'Failed to cancel invitation', 500);
    }
  }

  /**
   * Get board invitations
   */
  async getBoardInvitations(req, res) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        status: req.query.status
      };

      const result = await boardSharingService.getBoardInvitations(
        req.params.id,
        req.user.userId,
        options
      );

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, 'Board invitations retrieved successfully', 200, result.pagination);
    } catch (error) {
      console.error('Get board invitations error:', error);
      sendError(res, 'Failed to get board invitations', 500);
    }
  }

  /**
   * Get user invitations
   */
  async getUserInvitations(req, res) {
    try {
      const result = await boardSharingService.getUserInvitations(req.user.userId);

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, 'User invitations retrieved successfully');
    } catch (error) {
      console.error('Get user invitations error:', error);
      sendError(res, 'Failed to get user invitations', 500);
    }
  }

  /**
   * Generate public sharing link
   */
  async generateSharingLink(req, res) {
    try {
      const result = await boardSharingService.generateSharingLink(
        req.params.id,
        req.user.userId,
        req.body
      );

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, result.message);
    } catch (error) {
      console.error('Generate sharing link error:', error);
      sendError(res, 'Failed to generate sharing link', 500);
    }
  }

  /**
   * Join board via public link
   */
  async joinViaLink(req, res) {
    try {
      const result = await boardSharingService.joinViaLink(
        req.params.token,
        req.user.userId
      );

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, result.message);
    } catch (error) {
      console.error('Join via link error:', error);
      sendError(res, 'Failed to join board', 500);
    }
  }

  /**
   * Update board permissions
   */
  async updateBoardPermissions(req, res) {
    try {
      const result = await boardSharingService.updateBoardPermissions(
        req.params.id,
        req.user.userId,
        req.body
      );

      if (!result.success) {
        return sendError(res, result.error, result.statusCode || 400);
      }

      sendResponse(res, result.data, result.message);
    } catch (error) {
      console.error('Update board permissions error:', error);
      sendError(res, 'Failed to update board permissions', 500);
    }
  }

  /**
   * Get invitation details (public endpoint for invitation preview)
   */
  async getInvitationDetails(req, res) {
    try {
      // This is a public endpoint that doesn't require authentication
      // Used to show invitation preview before login/registration
      const BoardInvitation = require('../models/BoardInvitation');

      const invitation = await BoardInvitation.findByToken(req.params.token);
      if (!invitation || !invitation.canAccept()) {
        return sendError(res, 'Invitation not found or expired', 404);
      }

      const invitationData = {
        board: {
          title: invitation.board.title,
          description: invitation.board.description
        },
        invitedBy: {
          username: invitation.invitedBy.username
        },
        role: invitation.role,
        message: invitation.message,
        expiresAt: invitation.expiresAt,
        isExpired: invitation.isExpired()
      };

      sendResponse(res, invitationData, 'Invitation details retrieved successfully');
    } catch (error) {
      console.error('Get invitation details error:', error);
      sendError(res, 'Failed to get invitation details', 500);
    }
  }
}

module.exports = new BoardController();