const request = require('supertest');
const app = require('../server');

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(userData.name);
      expect(response.body.data.email).toBe(userData.email);
    });

    it('should return validation error for invalid email', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return validation error for short password', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: '123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials and return access and refresh tokens', async () => {
      // First register a user
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Then try to login
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email, password: userData.password })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('user');
    });

    it('should return error for invalid email format', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/refresh and /api/auth/logout', () => {
    it('should refresh access token and then allow logout', async () => {
      const userData = {
        name: 'Test User',
        email: 'refresh@example.com',
        password: 'password123'
      };

      await request(app).post('/api/auth/register').send(userData).expect(201);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email, password: userData.password })
        .expect(200);

      const refreshToken = loginRes.body.data.refreshToken;

      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshRes.body.data).toHaveProperty('accessToken');
      expect(refreshRes.body.data).toHaveProperty('refreshToken');

      await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken })
        .expect(200);
    });
  });
});
