'use strict';

const authService = require('../../services/authService');
const User = require('../../models/User');
const RefreshToken = require('../../models/RefreshToken');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../../utils/auth');

jest.mock('../../models/User');
jest.mock('../../models/RefreshToken');
jest.mock('../../utils/auth');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        _id: 'user123',
        ...userData,
        save: jest.fn().mockResolvedValue(true)
      };

      User.emailExists = jest.fn().mockResolvedValue(false);
      User.mockImplementation(() => mockUser);

      const result = await authService.register(userData);

      expect(User.emailExists).toHaveBeenCalledWith(userData.email);
      expect(User).toHaveBeenCalledWith({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: 'user'
      });
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toBe(mockUser);
    });

    it('should throw error if user already exists', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      User.emailExists = jest.fn().mockResolvedValue(true);

      await expect(authService.register(userData)).rejects.toThrow('User already exists');
      expect(User.emailExists).toHaveBeenCalledWith(userData.email);
    });

    it('should allow role setting in test environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const userData = {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin'
      };

      const mockUser = {
        save: jest.fn().mockResolvedValue(true)
      };

      User.emailExists = jest.fn().mockResolvedValue(false);
      User.mockImplementation(() => mockUser);

      await authService.register(userData);

      expect(User).toHaveBeenCalledWith({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: 'admin'
      });

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const ip = '127.0.0.1';
      const userAgent = 'Test Agent';

      const mockUser = {
        id: 'user123',
        _id: 'user123',
        email,
        name: 'Test User'
      };

      const mockTokens = {
        token: 'refresh.token.here',
        jti: 'jti123',
        expiresAt: new Date()
      };

      User.validateCredentials = jest.fn().mockResolvedValue(mockUser);
      generateAccessToken.mockReturnValue('access.token.here');
      generateRefreshToken.mockReturnValue(mockTokens);
      RefreshToken.create = jest.fn().mockResolvedValue(true);

      const result = await authService.login(email, password, ip, userAgent);

      expect(User.validateCredentials).toHaveBeenCalledWith(email, password);
      expect(generateAccessToken).toHaveBeenCalledWith(mockUser);
      expect(generateRefreshToken).toHaveBeenCalledWith('user123');
      expect(RefreshToken.create).toHaveBeenCalledWith({
        user: 'user123',
        jti: mockTokens.jti,
        expiresAt: mockTokens.expiresAt,
        createdByIp: ip,
        userAgent
      });
      expect(result).toEqual({
        user: mockUser,
        accessToken: 'access.token.here',
        refreshToken: 'refresh.token.here'
      });
    });

    it('should throw error for invalid credentials', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';

      User.validateCredentials = jest.fn().mockResolvedValue(null);

      await expect(authService.login(email, password, '127.0.0.1', null))
        .rejects.toThrow('Invalid credentials');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshToken = 'old.refresh.token';
      const ip = '127.0.0.1';
      const userAgent = 'Test Agent';

      const mockDecoded = {
        jti: 'old-jti',
        sub: 'user123'
      };

      const mockTokenRecord = {
        jti: 'old-jti',
        user: 'user123',
        revoked: false,
        expiresAt: new Date(Date.now() + 86400000),
        save: jest.fn().mockResolvedValue(true),
        replacedByJti: null
      };

      const mockNewTokens = {
        token: 'new.refresh.token',
        jti: 'new-jti',
        expiresAt: new Date()
      };

      const mockUser = {
        _id: 'user123',
        isActive: true
      };

      verifyRefreshToken.mockReturnValue(mockDecoded);
      RefreshToken.findOne = jest.fn().mockResolvedValue(mockTokenRecord);
      generateRefreshToken.mockReturnValue(mockNewTokens);
      RefreshToken.create = jest.fn().mockResolvedValue(true);
      User.findById = jest.fn().mockResolvedValue(mockUser);
      generateAccessToken.mockReturnValue('new.access.token');

      const result = await authService.refreshToken(refreshToken, ip, userAgent);

      expect(verifyRefreshToken).toHaveBeenCalledWith(refreshToken);
      expect(RefreshToken.findOne).toHaveBeenCalledWith({ jti: 'old-jti', user: 'user123' });
      expect(mockTokenRecord.revoked).toBe(true);
      expect(mockTokenRecord.replacedByJti).toBe('new-jti');
      expect(mockTokenRecord.save).toHaveBeenCalled();
      expect(RefreshToken.create).toHaveBeenCalledWith({
        user: 'user123',
        jti: 'new-jti',
        expiresAt: mockNewTokens.expiresAt,
        createdByIp: ip,
        userAgent
      });
      expect(result).toEqual({
        accessToken: 'new.access.token',
        refreshToken: 'new.refresh.token'
      });
    });

    it('should throw error for invalid refresh token', async () => {
      const refreshToken = 'invalid.token';

      verifyRefreshToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshToken(refreshToken, '127.0.0.1', null))
        .rejects.toThrow('Invalid token');
    });

    it('should throw error for expired token', async () => {
      const refreshToken = 'expired.token';
      const mockDecoded = { jti: 'jti', sub: 'user123' };
      const mockTokenRecord = {
        jti: 'jti',
        revoked: false,
        expiresAt: new Date(Date.now() - 1000) // Expired
      };

      verifyRefreshToken.mockReturnValue(mockDecoded);
      RefreshToken.findOne = jest.fn().mockResolvedValue(mockTokenRecord);

      await expect(authService.refreshToken(refreshToken, '127.0.0.1', null))
        .rejects.toThrow('Invalid or expired refresh token');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const refreshToken = 'valid.token';
      const mockDecoded = { jti: 'jti', sub: 'user123' };
      const mockTokenRecord = {
        jti: 'jti',
        revoked: false,
        save: jest.fn().mockResolvedValue(true)
      };

      verifyRefreshToken.mockReturnValue(mockDecoded);
      RefreshToken.findOne = jest.fn().mockResolvedValue(mockTokenRecord);

      await authService.logout(refreshToken);

      expect(verifyRefreshToken).toHaveBeenCalledWith(refreshToken);
      expect(RefreshToken.findOne).toHaveBeenCalledWith({ jti: 'jti', user: 'user123' });
      expect(mockTokenRecord.revoked).toBe(true);
      expect(mockTokenRecord.save).toHaveBeenCalled();
    });

    it('should throw error if refresh token is missing', async () => {
      await expect(authService.logout(null))
        .rejects.toThrow('Refresh token is required');
    });

    it('should handle invalid token during logout gracefully', async () => {
      const refreshToken = 'invalid.token';

      verifyRefreshToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Should not throw error
      await expect(authService.logout(refreshToken)).resolves.toBeUndefined();
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const userId = 'user123';
      const mockUser = {
        _id: userId,
        name: 'Test User',
        email: 'test@example.com',
        toPublicJSON: jest.fn().mockReturnValue({
          id: userId,
          name: 'Test User',
          email: 'test@example.com'
        })
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);

      const result = await authService.getProfile(userId);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(mockUser.toPublicJSON).toHaveBeenCalled();
      expect(result).toEqual({
        id: userId,
        name: 'Test User',
        email: 'test@example.com'
      });
    });

    it('should throw error if user not found', async () => {
      const userId = 'nonexistent';

      User.findById = jest.fn().mockResolvedValue(null);

      await expect(authService.getProfile(userId))
        .rejects.toThrow('User not found');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const userId = 'user123';
      const currentPassword = 'oldpassword';
      const newPassword = 'newpassword';

      const mockUser = {
        _id: userId,
        comparePassword: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true),
        password: 'hashedpassword'
      };

      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockUser)
      };

      User.findById = jest.fn().mockReturnValue(mockQuery);

      await authService.changePassword(userId, currentPassword, newPassword);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(mockQuery.select).toHaveBeenCalledWith('+password');
      expect(mockUser.comparePassword).toHaveBeenCalledWith(currentPassword);
      expect(mockUser.password).toBe(newPassword);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw error for incorrect current password', async () => {
      const userId = 'user123';
      const mockUser = {
        comparePassword: jest.fn().mockResolvedValue(false)
      };

      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockUser)
      };

      User.findById = jest.fn().mockReturnValue(mockQuery);

      await expect(authService.changePassword(userId, 'wrongpassword', 'newpassword'))
        .rejects.toThrow('Current password is incorrect');
    });
  });
});