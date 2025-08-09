const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');

describe('Health Routes', () => {
  beforeAll(async () => {
    // Ensure database is connected for tests
    if (mongoose.connection.readyState === 0) {
      const testUri = process.env.MONGODB_URI || 'mongodb+srv://cpangelo0102:w692jqERQGbS0IAl@cluster0.ahi85ym.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
      await mongoose.connect(testUri, {
        dbName: 'express_boilerplate_test'
      });
    }
  });

  afterAll(async () => {
    // Clean up database connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('API is running');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('environment');
      expect(response.body.data).toHaveProperty('version');
      expect(response.body.data).toHaveProperty('database');
    });
  });

  describe('GET /api/health/status', () => {
    it('should return detailed health status', async () => {
      const response = await request(app)
        .get('/api/health/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Health check passed');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('environment');
      expect(response.body.data).toHaveProperty('version');
      expect(response.body.data).toHaveProperty('memory');
      expect(response.body.data).toHaveProperty('cpu');
      expect(response.body.data).toHaveProperty('database');
    });
  });
});
