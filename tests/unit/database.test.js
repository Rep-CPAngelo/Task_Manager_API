const User = require('../../models/User');

describe('User Model', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

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
