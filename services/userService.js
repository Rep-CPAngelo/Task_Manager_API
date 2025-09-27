'use strict';

const User = require('../models/User');

class UserService {
  /**
   * Get all active users
   * @returns {Array} Array of users
   */
  async getAllUsers() {
    const users = await User.find({ isActive: true, isDeleted: false }).select('-password').lean();
    return {
      count: users.length,
      users: users.map(user => user.getPublicProfile())
    };
  }

  /**
   * Get user by ID
   * @param {String} userId - User ID
   * @returns {Object} User object
   */
  async getUserById(userId) {
    const user = await User.findById(userId).select('-password');
    if (!user || user.isDeleted) {
      throw new Error('User not found');
    }
    return user;
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Object} Created user
   */
  async createUser(userData) {
    const { name, email, password, role } = userData;

    // Check if user already exists
    const userExists = await User.emailExists(email);
    if (userExists) {
      throw new Error('User already exists');
    }

    // Create new user
    const newUser = new User({
      name,
      email,
      password,
      role: role || 'user'
    });

    await newUser.save();
    return newUser;
  }

  /**
   * Update user
   * @param {String} userId - User ID
   * @param {Object} updates - Update data
   * @returns {Object} Updated user
   */
  async updateUser(userId, updates) {
    const { name, email, role, isActive } = updates;

    const user = await User.findById(userId);
    if (!user || user.isDeleted) {
      throw new Error('User not found');
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        throw new Error('Email already in use');
      }
    }

    // Update user
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;

    await user.save();
    return user;
  }

  /**
   * Soft delete user
   * @param {String} userId - User ID
   * @param {String} deletedBy - ID of user performing the deletion
   */
  async deleteUser(userId, deletedBy) {
    const user = await User.findById(userId);
    if (!user || user.isDeleted) {
      throw new Error('User not found');
    }

    // Soft delete
    user.isActive = false;
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletedBy = deletedBy;
    await user.save();
  }

  /**
   * Search users with pagination
   * @param {Object} searchOptions - Search parameters
   * @returns {Object} Search results with pagination
   */
  async searchUsers(searchOptions) {
    const { query, page = 1, limit = 10, role } = searchOptions;

    // Build search criteria
    const searchCriteria = { isActive: true, isDeleted: false };

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
    const [users, total] = await Promise.all([
      User.find(searchCriteria)
        .select('-password')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 })
        .lean(),
      User.countDocuments(searchCriteria)
    ]);

    const usersData = users.map(user => user.getPublicProfile());

    return {
      users: usersData,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    };
  }

  /**
   * Get user statistics
   * @returns {Object} User statistics
   */
  async getUserStats() {
    return await User.getStats();
  }
}

module.exports = new UserService();