/**
 * Authentication Controller
 * Handles authentication-related business logic
 */

const User = require('../models/User');
const { generateToken } = require('../utils/auth');
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

      // Generate JWT token
      const token = generateToken(user);

      return successResponse(
        res,
        {
          token,
          user
        },
        'Login successful'
      );
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
}

module.exports = new AuthController();
