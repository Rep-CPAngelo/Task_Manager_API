/**
 * User Controller
 * Handles user-related business logic
 */

const User = require('../models/User');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

class UserController {
  /**
   * Get all users
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllUsers (req, res) {
    try {
      const users = await User.find({ isActive: true }).select('-password');

      return successResponse(
        res,
        {
          count: users.length,
          users: users.map(user => user.getPublicProfile())
        },
        'Users retrieved successfully'
      );
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
      const userId = req.params.id;
      const user = await User.findById(userId).select('-password');

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      return successResponse(res, user.getPublicProfile(), 'User retrieved successfully');
    } catch (error) {
      console.error('Get user by ID error:', error);
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
      const { name, email, password, role } = req.body;

      // Check if user already exists
      const userExists = await User.emailExists(email);
      if (userExists) {
        return errorResponse(res, 'User already exists', 400);
      }

      // Create new user
      const newUser = new User({
        name,
        email,
        password,
        role: role || 'user'
      });

      await newUser.save();

      return successResponse(
        res,
        newUser.getPublicProfile(),
        'User created successfully',
        201
      );
    } catch (error) {
      console.error('Create user error:', error);
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
      const userId = req.params.id;
      const { name, email, role, isActive } = req.body;

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
      if (role) user.role = role;
      if (typeof isActive === 'boolean') user.isActive = isActive;

      await user.save();

      return successResponse(res, user.getPublicProfile(), 'User updated successfully');
    } catch (error) {
      console.error('Update user error:', error);
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
      const userId = req.params.id;
      const user = await User.findById(userId);

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      // Soft delete - set isActive to false
      user.isActive = false;
      await user.save();

      return successResponse(res, null, 'User deleted successfully');
    } catch (error) {
      console.error('Delete user error:', error);
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
      const { query, page = 1, limit = 10, role } = req.query;

      // Build search criteria
      const searchCriteria = { isActive: true };

      if (query) {
        searchCriteria.$or = [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ];
      }

      if (role) {
        searchCriteria.role = role;
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Execute query
      const users = await User.find(searchCriteria)
        .select('-password')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await User.countDocuments(searchCriteria);

      const usersData = users.map(user => user.getPublicProfile());

      return paginatedResponse(
        res,
        usersData,
        parseInt(page),
        parseInt(limit),
        total
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
      const stats = await User.getStats();

      return successResponse(res, stats, 'User statistics retrieved successfully');
    } catch (error) {
      console.error('Get user stats error:', error);
      return errorResponse(res, 'Failed to fetch user statistics', 500);
    }
  }
}

module.exports = new UserController();
