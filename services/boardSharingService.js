'use strict';

const Board = require('../models/Board');
const BoardInvitation = require('../models/BoardInvitation');
const User = require('../models/User');
const emailService = require('./emailService');
const crypto = require('crypto');

class BoardSharingService {
  /**
   * Send board invitation to user or email
   */
  async inviteToBoard(boardId, invitedBy, inviteData, metadata = {}) {
    try {
      const { email, userId, role = 'member', message, inviteType = 'direct' } = inviteData;

      // Validate board exists and user has permission
      const board = await Board.findById(boardId);
      if (!board) {
        return { success: false, error: 'Board not found', statusCode: 404 };
      }

      if (!board.canEdit(invitedBy)) {
        return { success: false, error: 'Access denied', statusCode: 403 };
      }

      let targetUser = null;
      let targetEmail = email;

      // Handle user ID invitation
      if (userId) {
        targetUser = await User.findById(userId);
        if (!targetUser) {
          return { success: false, error: 'User not found', statusCode: 404 };
        }
        targetEmail = targetUser.email;
      }

      // Handle email invitation - check if user exists
      if (email && !userId) {
        targetUser = await User.findOne({ email: email.toLowerCase() });
        if (targetUser) {
          // User exists, convert to user invitation
          userId = targetUser._id;
        }
      }

      // Check if user is already a member
      if (targetUser && board.isMember(targetUser._id)) {
        return { success: false, error: 'User is already a member of this board', statusCode: 400 };
      }

      // Check for existing pending invitation
      const existingInvite = await BoardInvitation.findOne({
        board: boardId,
        $or: [
          { invitedUser: targetUser?._id },
          { email: targetEmail?.toLowerCase() }
        ],
        status: 'pending',
        expiresAt: { $gt: new Date() }
      });

      if (existingInvite) {
        return { success: false, error: 'Invitation already sent', statusCode: 400 };
      }

      // Create invitation
      const invitation = new BoardInvitation({
        board: boardId,
        invitedBy,
        invitedUser: targetUser?._id,
        email: targetUser ? null : targetEmail?.toLowerCase(),
        role,
        message,
        metadata: {
          ...metadata,
          inviteType
        }
      });

      await invitation.save();

      // Populate invitation for response
      await invitation.populate([
        { path: 'board', select: 'title description' },
        { path: 'invitedBy', select: 'username email' },
        { path: 'invitedUser', select: 'username email' }
      ]);

      // Send email notification
      try {
        await this.sendInvitationEmail(invitation);
      } catch (emailError) {
        console.warn('Failed to send invitation email:', emailError);
        // Don't fail the invitation if email fails
      }

      return {
        success: true,
        data: invitation,
        message: 'Invitation sent successfully'
      };
    } catch (error) {
      console.error('Invite to board error:', error);
      return { success: false, error: 'Failed to send invitation', statusCode: 500 };
    }
  }

  /**
   * Accept board invitation
   */
  async acceptInvitation(token, userId) {
    try {
      const invitation = await BoardInvitation.findByToken(token);
      if (!invitation) {
        return { success: false, error: 'Invitation not found', statusCode: 404 };
      }

      if (!invitation.canAccept()) {
        return { success: false, error: 'Invitation has expired or cannot be accepted', statusCode: 400 };
      }

      const board = invitation.board;
      if (!board) {
        return { success: false, error: 'Board not found', statusCode: 404 };
      }

      // For email invitations, associate with user
      if (!invitation.invitedUser && userId) {
        const user = await User.findById(userId);
        if (user && user.email.toLowerCase() === invitation.email) {
          invitation.invitedUser = userId;
        } else {
          return { success: false, error: 'Email mismatch', statusCode: 400 };
        }
      }

      const targetUserId = invitation.invitedUser || userId;
      if (!targetUserId) {
        return { success: false, error: 'Invalid user', statusCode: 400 };
      }

      // Check if user is already a member
      if (board.isMember(targetUserId)) {
        // User is already a member, just mark invitation as accepted
        invitation.accept(targetUserId);
        await invitation.save();
        return { success: true, data: board, message: 'User is already a member of this board' };
      }

      // Add user to board
      board.addMember(targetUserId, invitation.role, invitation.invitedBy);
      await board.save();

      // Mark invitation as accepted
      invitation.accept(targetUserId);
      await invitation.save();

      // Populate board for response
      await board.populate('members.user', 'username email');

      return {
        success: true,
        data: board,
        message: 'Invitation accepted successfully'
      };
    } catch (error) {
      console.error('Accept invitation error:', error);
      return { success: false, error: 'Failed to accept invitation', statusCode: 500 };
    }
  }

  /**
   * Decline board invitation
   */
  async declineInvitation(token, userId) {
    try {
      const invitation = await BoardInvitation.findByToken(token);
      if (!invitation) {
        return { success: false, error: 'Invitation not found', statusCode: 404 };
      }

      if (invitation.status !== 'pending') {
        return { success: false, error: 'Invitation cannot be declined', statusCode: 400 };
      }

      // Verify user can decline this invitation
      if (invitation.invitedUser && invitation.invitedUser.toString() !== userId) {
        return { success: false, error: 'Access denied', statusCode: 403 };
      }

      invitation.decline();
      await invitation.save();

      return {
        success: true,
        message: 'Invitation declined successfully'
      };
    } catch (error) {
      console.error('Decline invitation error:', error);
      return { success: false, error: 'Failed to decline invitation', statusCode: 500 };
    }
  }

  /**
   * Cancel board invitation
   */
  async cancelInvitation(invitationId, userId) {
    try {
      const invitation = await BoardInvitation.findById(invitationId)
        .populate('board', 'title');

      if (!invitation) {
        return { success: false, error: 'Invitation not found', statusCode: 404 };
      }

      const board = await Board.findById(invitation.board._id);
      if (!board || !board.canEdit(userId)) {
        return { success: false, error: 'Access denied', statusCode: 403 };
      }

      if (invitation.status !== 'pending') {
        return { success: false, error: 'Invitation cannot be cancelled', statusCode: 400 };
      }

      invitation.cancel();
      await invitation.save();

      return {
        success: true,
        message: 'Invitation cancelled successfully'
      };
    } catch (error) {
      console.error('Cancel invitation error:', error);
      return { success: false, error: 'Failed to cancel invitation', statusCode: 500 };
    }
  }

  /**
   * Get board invitations for a board
   */
  async getBoardInvitations(boardId, userId, options = {}) {
    try {
      const { page = 1, limit = 20, status } = options;

      const board = await Board.findById(boardId);
      if (!board) {
        return { success: false, error: 'Board not found', statusCode: 404 };
      }

      if (!board.canView(userId)) {
        return { success: false, error: 'Access denied', statusCode: 403 };
      }

      const query = { board: boardId };
      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;
      const invitations = await BoardInvitation.find(query)
        .populate('invitedBy', 'username email')
        .populate('invitedUser', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await BoardInvitation.countDocuments(query);

      return {
        success: true,
        data: invitations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get board invitations error:', error);
      return { success: false, error: 'Failed to get invitations', statusCode: 500 };
    }
  }

  /**
   * Get user invitations
   */
  async getUserInvitations(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found', statusCode: 404 };
      }

      // Get invitations by user ID and email
      const userInvitations = await BoardInvitation.findPendingByUser(userId);
      const emailInvitations = await BoardInvitation.findPendingByEmail(user.email);

      // Combine and deduplicate
      const allInvitations = [...userInvitations, ...emailInvitations];
      const uniqueInvitations = allInvitations.filter((invitation, index, self) =>
        index === self.findIndex(i => i._id.toString() === invitation._id.toString())
      );

      return {
        success: true,
        data: uniqueInvitations
      };
    } catch (error) {
      console.error('Get user invitations error:', error);
      return { success: false, error: 'Failed to get user invitations', statusCode: 500 };
    }
  }

  /**
   * Generate public sharing link
   */
  async generateSharingLink(boardId, userId, options = {}) {
    try {
      const { role = 'viewer', expiresIn = 7 * 24 * 60 * 60 * 1000 } = options; // 7 days default

      const board = await Board.findById(boardId);
      if (!board) {
        return { success: false, error: 'Board not found', statusCode: 404 };
      }

      if (!board.canEdit(userId)) {
        return { success: false, error: 'Access denied', statusCode: 403 };
      }

      // Create a special invitation for public sharing
      const invitation = new BoardInvitation({
        board: boardId,
        invitedBy: userId,
        role,
        expiresAt: new Date(Date.now() + expiresIn),
        metadata: {
          inviteType: 'link'
        }
      });

      await invitation.save();

      const sharingLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/boards/join/${invitation.token}`;

      return {
        success: true,
        data: {
          link: sharingLink,
          token: invitation.token,
          expiresAt: invitation.expiresAt,
          role
        },
        message: 'Sharing link generated successfully'
      };
    } catch (error) {
      console.error('Generate sharing link error:', error);
      return { success: false, error: 'Failed to generate sharing link', statusCode: 500 };
    }
  }

  /**
   * Join board via public link
   */
  async joinViaLink(token, userId) {
    try {
      const invitation = await BoardInvitation.findByToken(token);
      if (!invitation) {
        return { success: false, error: 'Invalid or expired link', statusCode: 404 };
      }

      if (!invitation.canAccept()) {
        return { success: false, error: 'Link has expired', statusCode: 400 };
      }

      const board = invitation.board;
      if (!board) {
        return { success: false, error: 'Board not found', statusCode: 404 };
      }

      // Check if user is already a member
      if (board.isMember(userId)) {
        return { success: true, data: board, message: 'You are already a member of this board' };
      }

      // Add user to board
      board.addMember(userId, invitation.role, invitation.invitedBy);
      await board.save();

      // Don't mark link invitations as accepted to allow reuse
      if (invitation.metadata.inviteType !== 'link') {
        invitation.accept(userId);
        await invitation.save();
      }

      await board.populate('members.user', 'username email');

      return {
        success: true,
        data: board,
        message: 'Successfully joined the board'
      };
    } catch (error) {
      console.error('Join via link error:', error);
      return { success: false, error: 'Failed to join board', statusCode: 500 };
    }
  }

  /**
   * Send invitation email
   */
  async sendInvitationEmail(invitation) {
    const board = invitation.board;
    const invitedBy = invitation.invitedBy;
    const targetEmail = invitation.email || invitation.invitedUser?.email;

    if (!targetEmail) {
      throw new Error('No email address found for invitation');
    }

    const joinLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/boards/join/${invitation.token}`;

    const emailData = {
      to: targetEmail,
      subject: `You've been invited to join "${board.title}" board`,
      template: 'board-invitation',
      context: {
        boardTitle: board.title,
        boardDescription: board.description,
        inviterName: invitedBy.username || invitedBy.email,
        role: invitation.role,
        message: invitation.message,
        joinLink,
        expiresAt: invitation.expiresAt
      }
    };

    return await emailService.sendEmail(emailData);
  }

  /**
   * Update board permissions
   */
  async updateBoardPermissions(boardId, userId, permissionUpdates) {
    try {
      const board = await Board.findById(boardId);
      if (!board) {
        return { success: false, error: 'Board not found', statusCode: 404 };
      }

      if (!board.canEdit(userId)) {
        return { success: false, error: 'Access denied', statusCode: 403 };
      }

      // Update board settings
      if (permissionUpdates.settings) {
        Object.assign(board.settings, permissionUpdates.settings);
      }

      // Update visibility
      if (permissionUpdates.visibility) {
        board.visibility = permissionUpdates.visibility;
      }

      await board.save();

      return {
        success: true,
        data: board,
        message: 'Board permissions updated successfully'
      };
    } catch (error) {
      console.error('Update board permissions error:', error);
      return { success: false, error: 'Failed to update permissions', statusCode: 500 };
    }
  }
}

module.exports = new BoardSharingService();