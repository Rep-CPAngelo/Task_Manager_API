'use strict';

const userService = require('../../services/userService');
const User = require('../../models/User');

jest.mock('../../models/User');

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should return all active users', async () => {
      const mockUsers = [
        {
          _id: 'user1',
          name: 'User 1',
          email: 'user1@example.com',
          getPublicProfile: jest.fn().mockReturnValue({ id: 'user1', name: 'User 1', email: 'user1@example.com' })
        },
        {
          _id: 'user2',
          name: 'User 2',
          email: 'user2@example.com',
          getPublicProfile: jest.fn().mockReturnValue({ id: 'user2', name: 'User 2', email: 'user2@example.com' })
        }
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUsers)
      };

      User.find = jest.fn().mockReturnValue(mockQuery);

      const result = await userService.getAllUsers();

      expect(User.find).toHaveBeenCalledWith({ isActive: true, isDeleted: false });
      expect(mockQuery.select).toHaveBeenCalledWith('-password');
      expect(mockQuery.lean).toHaveBeenCalled();
      expect(result.count).toBe(2);
      expect(result.users).toHaveLength(2);
    });

    it('should return empty result when no users found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };

      User.find = jest.fn().mockReturnValue(mockQuery);

      const result = await userService.getAllUsers();

      expect(result.count).toBe(0);
      expect(result.users).toEqual([]);
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const mockUser = {
        _id: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        isDeleted: false
      };

      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockUser)
      };

      User.findById = jest.fn().mockReturnValue(mockQuery);

      const result = await userService.getUserById('user123');

      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(mockQuery.select).toHaveBeenCalledWith('-password');
      expect(result).toBe(mockUser);
    });

    it('should throw error if user not found', async () => {
      const mockQuery = {
        select: jest.fn().mockResolvedValue(null)
      };

      User.findById = jest.fn().mockReturnValue(mockQuery);

      await expect(userService.getUserById('nonexistent'))
        .rejects.toThrow('User not found');
    });

    it('should throw error if user is deleted', async () => {
      const mockUser = {
        _id: 'user123',
        isDeleted: true
      };

      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockUser)
      };

      User.findById = jest.fn().mockReturnValue(mockQuery);

      await expect(userService.getUserById('user123'))
        .rejects.toThrow('User not found');
    });
  });

  describe('createUser', () => {
    it('should create new user successfully', async () => {
      const userData = {
        name: 'New User',
        email: 'new@example.com',
        password: 'password123'
      };

      const mockUser = {
        _id: 'newuser123',
        ...userData,
        role: 'user',
        save: jest.fn().mockResolvedValue(true)
      };

      User.emailExists = jest.fn().mockResolvedValue(false);
      User.mockImplementation(() => mockUser);

      const result = await userService.createUser(userData);

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

    it('should create user with specified role', async () => {
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

      await userService.createUser(userData);

      expect(User).toHaveBeenCalledWith({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: 'admin'
      });
    });

    it('should throw error if user already exists', async () => {
      const userData = {
        name: 'Existing User',
        email: 'existing@example.com',
        password: 'password123'
      };

      User.emailExists = jest.fn().mockResolvedValue(true);

      await expect(userService.createUser(userData))
        .rejects.toThrow('User already exists');
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const userId = 'user123';
      const updates = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };

      const mockUser = {
        _id: userId,
        name: 'Old Name',
        email: 'old@example.com',
        isDeleted: false,
        save: jest.fn().mockResolvedValue(true)
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);
      User.findByEmail = jest.fn().mockResolvedValue(null);

      const result = await userService.updateUser(userId, updates);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(User.findByEmail).toHaveBeenCalledWith(updates.email);
      expect(mockUser.name).toBe(updates.name);
      expect(mockUser.email).toBe(updates.email);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toBe(mockUser);
    });

    it('should throw error if user not found', async () => {
      const userId = 'nonexistent';
      const updates = { name: 'New Name' };

      User.findById = jest.fn().mockResolvedValue(null);

      await expect(userService.updateUser(userId, updates))
        .rejects.toThrow('User not found');
    });

    it('should throw error if email is already in use', async () => {
      const userId = 'user123';
      const updates = { email: 'taken@example.com' };

      const mockUser = {
        _id: userId,
        email: 'current@example.com',
        isDeleted: false
      };

      const existingUser = {
        _id: 'other123',
        email: 'taken@example.com'
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);
      User.findByEmail = jest.fn().mockResolvedValue(existingUser);

      await expect(userService.updateUser(userId, updates))
        .rejects.toThrow('Email already in use');
    });

    it('should allow same email update', async () => {
      const userId = 'user123';
      const updates = { email: 'same@example.com' };

      const mockUser = {
        _id: userId,
        email: 'same@example.com',
        isDeleted: false,
        save: jest.fn().mockResolvedValue(true)
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);

      const result = await userService.updateUser(userId, updates);

      expect(User.findByEmail).not.toHaveBeenCalled();
      expect(result).toBe(mockUser);
    });

    it('should update isActive status', async () => {
      const userId = 'user123';
      const updates = { isActive: false };

      const mockUser = {
        _id: userId,
        isActive: true,
        isDeleted: false,
        save: jest.fn().mockResolvedValue(true)
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);

      await userService.updateUser(userId, updates);

      expect(mockUser.isActive).toBe(false);
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user successfully', async () => {
      const userId = 'user123';
      const deletedBy = 'admin123';

      const mockUser = {
        _id: userId,
        isDeleted: false,
        isActive: true,
        save: jest.fn().mockResolvedValue(true)
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);

      await userService.deleteUser(userId, deletedBy);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(mockUser.isActive).toBe(false);
      expect(mockUser.isDeleted).toBe(true);
      expect(mockUser.deletedAt).toBeInstanceOf(Date);
      expect(mockUser.deletedBy).toBe(deletedBy);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      const userId = 'nonexistent';
      const deletedBy = 'admin123';

      User.findById = jest.fn().mockResolvedValue(null);

      await expect(userService.deleteUser(userId, deletedBy))
        .rejects.toThrow('User not found');
    });

    it('should throw error if user already deleted', async () => {
      const userId = 'user123';
      const deletedBy = 'admin123';

      const mockUser = {
        _id: userId,
        isDeleted: true
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);

      await expect(userService.deleteUser(userId, deletedBy))
        .rejects.toThrow('User not found');
    });
  });

  describe('searchUsers', () => {
    it('should search users with query and return paginated results', async () => {
      const mockUsers = [
        {
          _id: 'user1',
          name: 'John Doe',
          email: 'john@example.com',
          getPublicProfile: jest.fn().mockReturnValue({ id: 'user1', name: 'John Doe' })
        }
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUsers)
      };

      User.find = jest.fn().mockReturnValue(mockQuery);
      User.countDocuments = jest.fn().mockResolvedValue(1);

      const searchOptions = {
        query: 'john',
        page: 1,
        limit: 10,
        role: 'user'
      };

      const result = await userService.searchUsers(searchOptions);

      const expectedCriteria = {
        isActive: true,
        isDeleted: false,
        $or: [
          { name: { $regex: 'john', $options: 'i' } },
          { email: { $regex: 'john', $options: 'i' } }
        ],
        role: 'user'
      };

      expect(User.find).toHaveBeenCalledWith(expectedCriteria);
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result.users).toHaveLength(1);
      expect(result.pagination).toEqual({
        current: 1,
        limit: 10,
        total: 1,
        pages: 1
      });
    });

    it('should search without query parameter', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };

      User.find = jest.fn().mockReturnValue(mockQuery);
      User.countDocuments = jest.fn().mockResolvedValue(0);

      const searchOptions = {
        page: 1,
        limit: 10
      };

      await userService.searchUsers(searchOptions);

      const expectedCriteria = {
        isActive: true,
        isDeleted: false
      };

      expect(User.find).toHaveBeenCalledWith(expectedCriteria);
    });

    it('should handle pagination correctly', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };

      User.find = jest.fn().mockReturnValue(mockQuery);
      User.countDocuments = jest.fn().mockResolvedValue(25);

      const searchOptions = {
        page: 3,
        limit: 5
      };

      const result = await userService.searchUsers(searchOptions);

      expect(mockQuery.skip).toHaveBeenCalledWith(10); // (3-1) * 5
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
      expect(result.pagination.pages).toBe(5); // Math.ceil(25/5)
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const mockStats = {
        totalUsers: 100,
        activeUsers: 95,
        inactiveUsers: 5
      };

      User.getStats = jest.fn().mockResolvedValue(mockStats);

      const result = await userService.getUserStats();

      expect(User.getStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });
});