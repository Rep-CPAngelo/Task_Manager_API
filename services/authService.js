'use strict';

const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} = require('../utils/auth');

class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Object} Created user
   */
  async register(userData) {
    const { name, email, password, role } = userData;

    // Check if user already exists
    const userExists = await User.emailExists(email);
    if (userExists) {
      throw new Error('User already exists');
    }

    // Only allow setting role if in test environment, otherwise default to 'user'
    const newUser = new User({
      name,
      email,
      password,
      role: process.env.NODE_ENV === 'test' ? (role || 'user') : 'user'
    });

    await newUser.save();
    return newUser;
  }

  /**
   * Login user
   * @param {String} email - User email
   * @param {String} password - User password
   * @param {String} ip - User IP address
   * @param {String} userAgent - User agent string
   * @returns {Object} User data and tokens
   */
  async login(email, password, ip, userAgent) {
    // Validate credentials
    const user = await User.validateCredentials(email, password);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const { token: refreshToken, jti, expiresAt } = generateRefreshToken(user.id || user._id);

    // Persist refresh token metadata
    await RefreshToken.create({
      user: user.id || user._id,
      jti,
      expiresAt,
      createdByIp: ip,
      userAgent
    });

    return {
      user,
      accessToken,
      refreshToken
    };
  }

  /**
   * Refresh access token
   * @param {String} refreshToken - Refresh token
   * @param {String} ip - User IP address
   * @param {String} userAgent - User agent string
   * @returns {Object} New tokens
   */
  async refreshToken(refreshToken, ip, userAgent) {
    // Validate refresh token signature and payload
    const decoded = verifyRefreshToken(refreshToken);
    const { jti, sub } = decoded;

    // Check token record
    const tokenRecord = await RefreshToken.findOne({ jti, user: sub });
    if (!tokenRecord || tokenRecord.revoked || tokenRecord.expiresAt < new Date()) {
      throw new Error('Invalid or expired refresh token');
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
      createdByIp: ip,
      userAgent
    });

    // Issue new access token
    const user = await User.findById(sub);
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    const accessToken = generateAccessToken(user);
    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Logout user
   * @param {String} refreshToken - Refresh token to invalidate
   */
  async logout(refreshToken) {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    try {
      const decoded = verifyRefreshToken(refreshToken);
      const { jti, sub } = decoded;
      const tokenRecord = await RefreshToken.findOne({ jti, user: sub });

      if (tokenRecord) {
        tokenRecord.revoked = true;
        await tokenRecord.save();
      }
    } catch (error) {
      // Token might be invalid, but we still want to return success
      console.log('Token verification failed during logout:', error.message);
    }
  }

  /**
   * Get user profile
   * @param {String} userId - User ID
   * @returns {Object} User profile
   */
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user.toPublicJSON();
  }

  /**
   * Update user profile
   * @param {String} userId - User ID
   * @param {Object} updates - Profile updates
   * @returns {Object} Updated user profile
   */
  async updateProfile(userId, updates) {
    const { name, email } = updates;

    const user = await User.findById(userId);
    if (!user) {
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

    await user.save();
    return user;
  }

  /**
   * Change user password
   * @param {String} userId - User ID
   * @param {String} currentPassword - Current password
   * @param {String} newPassword - New password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new Error('User not found');
    }

    // Validate current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();
  }

  /**
   * Validate refresh token and get user
   * @param {String} refreshToken - Refresh token
   * @returns {Object} Token document with user
   */
  async validateRefreshToken(refreshToken) {
    const tokenDoc = await RefreshToken.findOne({ token: refreshToken })
      .populate('user', 'name email role');

    if (!tokenDoc || tokenDoc.expiresAt <= new Date()) {
      return null;
    }

    return tokenDoc;
  }

  /**
   * Clean up expired refresh tokens
   * @returns {Number} Number of deleted tokens
   */
  async cleanupExpiredTokens() {
    const result = await RefreshToken.deleteMany({
      expiresAt: { $lte: new Date() }
    });

    return result.deletedCount;
  }
}

module.exports = new AuthService();