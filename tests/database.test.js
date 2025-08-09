const mongoose = require('mongoose');
const User = require('../models/User');

describe('Database Connection', () => {
  beforeAll(async () => {
    // Connect to test database
    const testUri = process.env.MONGODB_URI || 'mongodb+srv://cpangelo0102:w692jqERQGbS0IAl@cluster0.ahi85ym.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

    try {
      await mongoose.connect(testUri, {
        dbName: 'express_boilerplate_test'
      });
    } catch (error) {
      console.error('Failed to connect to test database:', error);
    }
  });

  afterAll(async () => {
    try {
      // Clean up and disconnect
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  });

  beforeEach(async () => {
    try {
      // Clear users collection before each test
      await User.deleteMany({});
    } catch (error) {
      console.error('Error clearing users:', error);
    }
  });

  describe('User Model', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.name).toBe(userData.name);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.password).not.toBe(userData.password); // Should be hashed
      expect(savedUser.role).toBe('user');
      expect(savedUser.isActive).toBe(true);
    });

    it('should not create user with duplicate email', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      // Create first user
      const user1 = new User(userData);
      await user1.save();

      // Try to create second user with same email
      const user2 = new User(userData);
      await expect(user2.save()).rejects.toThrow();
    });

    it('should validate required fields', async () => {
      const user = new User({});

      try {
        await user.save();
      } catch (error) {
        expect(error.name).toBe('ValidationError');
        expect(error.errors.name).toBeDefined();
        expect(error.errors.email).toBeDefined();
        expect(error.errors.password).toBeDefined();
      }
    });

    it('should hash password before saving', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.password).not.toBe(userData.password);
      expect(savedUser.password).toMatch(/^\$2[aby]\$\d{1,2}\$[./A-Za-z0-9]{53}$/); // bcrypt hash pattern
    });

    it('should compare password correctly', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      const user = new User(userData);
      await user.save();

      const isMatch = await user.comparePassword('password123');
      expect(isMatch).toBe(true);

      const isNotMatch = await user.comparePassword('wrongpassword');
      expect(isNotMatch).toBe(false);
    });
  });
});
