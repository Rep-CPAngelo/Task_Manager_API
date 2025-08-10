/**
 * Authentication Controller
 * Handles authentication-related business logic
 */

const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} = require('../utils/auth');
const { successResponse, errorResponse } = require('../utils/response');

class AuthController {
  /**
   * Register a new user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async register (req, res) {
    try {
      const { name, email, password } = req.body;

      // Check if user already exists
      const userExists = await User.emailExists(email);
      if (userExists) {
        return errorResponse(res, 'User already exists', 400);
      }

      // Create new user
      const newUser = new User({
        name,
        email,
        password
      });

      await newUser.save();

      return successResponse(
        res,
        newUser.getPublicProfile(),
        'User registered successfully',
        201
      );
    } catch (error) {
      console.error('Registration error:', error);
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

      // Validate credentials
      const user = await User.validateCredentials(email, password);
      if (!user) {
        return errorResponse(res, 'Invalid credentials', 401);
      }

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const { token: refreshToken, jti, expiresAt } = generateRefreshToken(user.id || user._id);

      // Persist refresh token metadata
      await RefreshToken.create({
        user: user.id || user._id,
        jti,
        expiresAt,
        createdByIp: req.ip,
        userAgent: req.headers['user-agent'] || null
      });

      return successResponse(res, { accessToken, refreshToken, user }, 'Login successful');
    } catch (error) {
      console.error('Login error:', error);
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
      const userId = req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      return successResponse(res, user.getPublicProfile(), 'Profile retrieved successfully');
    } catch (error) {
      console.error('Get profile error:', error);
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
      const userId = req.user.id;
      const { name, email } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      // Check if email is already taken by another user
      if (email && email !== user.email) {
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
          return errorResponse(res, 'Email already in use', 400);
        }
      }

      // Update user
      if (name) user.name = name;
      if (email) user.email = email;

      await user.save();

      return successResponse(res, user.getPublicProfile(), 'Profile updated successfully');
    } catch (error) {
      console.error('Update profile error:', error);
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
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(userId).select('+password');
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      // Validate current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return errorResponse(res, 'Current password is incorrect', 400);
      }

      // Update password
      user.password = newPassword;
      await user.save();

      return successResponse(res, null, 'Password changed successfully');
    } catch (error) {
      console.error('Change password error:', error);
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

      // Validate refresh token signature and payload
      const decoded = verifyRefreshToken(refreshToken);
      const { jti, sub } = decoded;

      // Check token record
      const tokenRecord = await RefreshToken.findOne({ jti, user: sub });
      if (!tokenRecord || tokenRecord.revoked || tokenRecord.expiresAt < new Date()) {
        return errorResponse(res, 'Invalid or expired refresh token', 401);
      }

      // Rotate refresh token: revoke old and create new
      tokenRecord.revoked = true;
      const { token: newRefreshToken, jti: newJti, expiresAt: newExpiresAt } = generateRefreshToken(sub);
      tokenRecord.replacedByJti = newJti;
      await tokenRecord.save();

      await RefreshToken.create({
        user: sub,
        jti: newJti,
        expiresAt: newExpiresAt,
        createdByIp: req.ip,
        userAgent: req.headers['user-agent'] || null
      });

      // Issue new access token
      const user = await User.findById(sub);
      if (!user || !user.isActive) {
        return errorResponse(res, 'User not found or inactive', 404);
      }
      const accessToken = generateAccessToken(user);

      return successResponse(res, {
        accessToken,
        refreshToken: newRefreshToken
      }, 'Token refreshed');
    } catch (error) {
      console.error('Refresh token error:', error);
      return errorResponse(res, 'Invalid refresh token', 401);
    }
  }

  /**
   * Logout: revoke current refresh token
   */
  async logout (req, res) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return errorResponse(res, 'Refresh token is required', 400);
      }
      const decoded = verifyRefreshToken(refreshToken);
      const { jti, sub } = decoded;
      const tokenRecord = await RefreshToken.findOne({ jti, user: sub });
      if (!tokenRecord) {
        return successResponse(res, null, 'Logged out');
      }
      tokenRecord.revoked = true;
      await tokenRecord.save();
      return successResponse(res, null, 'Logged out');
    } catch (error) {
      console.error('Logout error:', error);
      return errorResponse(res, 'Failed to logout', 400);
    }
  }
}

module.exports = new AuthController();
 