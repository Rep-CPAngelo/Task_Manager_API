/**
 * Authentication utilities
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const crypto = require('crypto');

// Access token
const generateAccessToken = (user) => {
  try {
    const payload = {
      user: {
        id: user.id || user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
    return jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
  } catch (error) {
    console.error('Access token generation error:', error);
    throw new Error('Failed to generate access token');
  }
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
  } catch (error) {
    console.error('Access token verification error:', error);
    throw new Error('Invalid token');
  }
};

// Refresh token (JWT with jti)
const generateRefreshToken = (userId) => {
  try {
    const jti = crypto.randomUUID();
    const payload = { sub: String(userId), jti };
    const token = jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET || 'your_jwt_secret_key_here') + '_refresh',
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
    const decoded = jwt.decode(token);
    const expiresAt = decoded && decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return { token, jti, expiresAt };
  } catch (error) {
    console.error('Refresh token generation error:', error);
    throw new Error('Failed to generate refresh token');
  }
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET || 'your_jwt_secret_key_here') + '_refresh'
    );
  } catch (error) {
    console.error('Refresh token verification error:', error);
    throw new Error('Invalid token');
  }
};

/**
 * Hash password
 * @param {string} password - Plain text password
 * @returns {string} Hashed password
 */
const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(12);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    throw new Error('Password hashing failed');
  }
};

/**
 * Compare password
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {boolean} Match result
 */
const comparePassword = async (password, hashedPassword) => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

module.exports = {
  // Backwards compatibility
  generateToken: generateAccessToken,
  verifyToken: verifyAccessToken,
  // New explicit exports
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashPassword,
  comparePassword
};
