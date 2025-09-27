/**
 * User Controller
 * Handles user-related HTTP requests
 */

const userService = require('../services/userService');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

class UserController {
  /**
   * Get all users
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllUsers (req, res) {
    try {
      const result = await userService.getAllUsers();
      return successResponse(res, result, 'Users retrieved successfully');
    } catch (error) {
      console.error('Get all users error:', error);
      return errorResponse(res, 'Failed to fetch users', 500);
    }
  }

  /**
   * Get user by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserById (req, res) {
    try {
      const user = await userService.getUserById(req.params.id);
      return successResponse(res, user.getPublicProfile(), 'User retrieved successfully');
    } catch (error) {
      console.error('Get user by ID error:', error);
      if (error.message === 'User not found') {
        return errorResponse(res, 'User not found', 404);
      }
      return errorResponse(res, 'Failed to fetch user', 500);
    }
  }

  /**
   * Create new user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createUser (req, res) {
    try {
      const newUser = await userService.createUser(req.body);
      return successResponse(res, newUser.getPublicProfile(), 'User created successfully', 201);
    } catch (error) {
      console.error('Create user error:', error);
      if (error.message === 'User already exists') {
        return errorResponse(res, error.message, 400);
      }
      if (error.name === 'ValidationError') {
        return errorResponse(res, error.message, 400);
      }
      return errorResponse(res, 'Failed to create user', 500);
    }
  }

  /**
   * Update user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateUser (req, res) {
    try {
      const user = await userService.updateUser(req.params.id, req.body);
      return successResponse(res, user.getPublicProfile(), 'User updated successfully');
    } catch (error) {
      console.error('Update user error:', error);
      if (error.message === 'User not found') {
        return errorResponse(res, 'User not found', 404);
      }
      if (error.message === 'Email already in use') {
        return errorResponse(res, 'Email already in use', 400);
      }
      if (error.name === 'ValidationError') {
        return errorResponse(res, error.message, 400);
      }
      return errorResponse(res, 'Failed to update user', 500);
    }
  }

  /**
   * Delete user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteUser (req, res) {
    try {
      await userService.deleteUser(req.params.id, req.user.id);
      return successResponse(res, null, 'User deleted successfully (soft)');
    } catch (error) {
      console.error('Delete user error:', error);
      if (error.message === 'User not found') {
        return errorResponse(res, 'User not found', 404);
      }
      return errorResponse(res, 'Failed to delete user', 500);
    }
  }

  /**
   * Search users
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchUsers (req, res) {
    try {
      const result = await userService.searchUsers(req.query);
      return paginatedResponse(
        res,
        result.users,
        result.pagination.current,
        result.pagination.limit,
        result.pagination.total
      );
    } catch (error) {
      console.error('Search users error:', error);
      return errorResponse(res, 'Failed to search users', 500);
    }
  }

  /**
   * Get user statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserStats (req, res) {
    try {
      const stats = await userService.getUserStats();
      return successResponse(res, stats, 'User statistics retrieved successfully');
    } catch (error) {
      console.error('Get user stats error:', error);
      return errorResponse(res, 'Failed to fetch user statistics', 500);
    }
  }
}

module.exports = new UserController();
