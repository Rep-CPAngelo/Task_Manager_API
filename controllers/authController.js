/**
 * Authentication Controller
 * Handles authentication-related HTTP requests
 */

const authService = require('../services/authService');
const { successResponse, errorResponse } = require('../utils/response');

class AuthController {
  /**
   * Register a new user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async register (req, res) {
    try {
      const newUser = await authService.register(req.body);
      return successResponse(
        res,
        newUser.getPublicProfile(),
        'User registered successfully',
        201
      );
    } catch (error) {
      console.error('Registration error:', error);
      if (error.message === 'User already exists') {
        return errorResponse(res, error.message, 400);
      }
      if (error.name === 'ValidationError') {
        return errorResponse(res, error.message, 400);
      }
      return errorResponse(res, 'Server error', 500);
    }
  }

  /**
   * Login user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async login (req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password, req.ip, req.headers['user-agent'] || null);
      return successResponse(res, result, 'Login successful');
    } catch (error) {
      console.error('Login error:', error);
      if (error.message === 'Invalid credentials') {
        return errorResponse(res, 'Invalid credentials', 401);
      }
      return errorResponse(res, 'Server error', 500);
    }
  }

  /**
   * Get current user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProfile (req, res) {
    try {
      const user = await authService.getProfile(req.user.id);
      return successResponse(res, user, 'Profile retrieved successfully');
    } catch (error) {
      console.error('Get profile error:', error);
      if (error.message === 'User not found') {
        return errorResponse(res, 'User not found', 404);
      }
      return errorResponse(res, 'Server error', 500);
    }
  }

  /**
   * Update user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateProfile (req, res) {
    try {
      const user = await authService.updateProfile(req.user.id, req.body);
      return successResponse(res, user.getPublicProfile(), 'Profile updated successfully');
    } catch (error) {
      console.error('Update profile error:', error);
      if (error.message === 'User not found') {
        return errorResponse(res, 'User not found', 404);
      }
      if (error.message === 'Email already in use') {
        return errorResponse(res, 'Email already in use', 400);
      }
      if (error.name === 'ValidationError') {
        return errorResponse(res, error.message, 400);
      }
      return errorResponse(res, 'Server error', 500);
    }
  }

  /**
   * Change password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async changePassword (req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(req.user.id, currentPassword, newPassword);
      return successResponse(res, null, 'Password changed successfully');
    } catch (error) {
      console.error('Change password error:', error);
      if (error.message === 'User not found') {
        return errorResponse(res, 'User not found', 404);
      }
      if (error.message === 'Current password is incorrect') {
        return errorResponse(res, 'Current password is incorrect', 400);
      }
      if (error.name === 'ValidationError') {
        return errorResponse(res, error.message, 400);
      }
      return errorResponse(res, 'Server error', 500);
    }
  }

  /**
   * Refresh access token
   */
  async refresh (req, res) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return errorResponse(res, 'Refresh token is required', 400);
      }

      const result = await authService.refreshToken(refreshToken, req.ip, req.headers['user-agent'] || null);
      return successResponse(res, result, 'Token refreshed');
    } catch (error) {
      console.error('Refresh token error:', error);
      if (error.message.includes('Invalid or expired') || error.message.includes('User not found')) {
        return errorResponse(res, error.message, 401);
      }
      return errorResponse(res, 'Invalid refresh token', 401);
    }
  }

  /**
   * Logout: revoke current refresh token
   */
  async logout (req, res) {
    try {
      const { refreshToken } = req.body;
      await authService.logout(refreshToken);
      return successResponse(res, null, 'Logged out');
    } catch (error) {
      console.error('Logout error:', error);
      if (error.message === 'Refresh token is required') {
        return errorResponse(res, 'Refresh token is required', 400);
      }
      return errorResponse(res, 'Failed to logout', 400);
    }
  }
}

module.exports = new AuthController();
 