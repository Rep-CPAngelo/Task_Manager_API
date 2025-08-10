const request = require('supertest');
const app = require('../server');

describe('Health Routes', () => {
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
