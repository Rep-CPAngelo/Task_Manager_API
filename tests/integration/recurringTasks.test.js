'use strict';

const request = require('supertest');
const app = require('../../server');

const registerAndLogin = async (overrides = {}) => {
  const user = {
    name: 'Recurring Task User',
    email: `recurring${Math.random().toString(36).slice(2, 7)}@example.com`,
    password: 'password123',
    ...overrides
  };

  await request(app).post('/api/auth/register').send(user).expect(201);
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password })
    .expect(200);

  return {
    user: loginRes.body.data.user,
    accessToken: loginRes.body.data.accessToken
  };
};

describe('Recurring Tasks Integration', () => {
  let userToken, adminToken;

  beforeAll(async () => {
    // Register regular user
    const user = await registerAndLogin();
    userToken = user.accessToken;

    // Register admin user
    const admin = await registerAndLogin({
      email: `admin${Date.now()}@example.com`,
      role: 'admin',
      name: 'Admin User'
    });
    adminToken = admin.accessToken;
  });

  describe('POST /api/tasks/recurring', () => {
    it('should create a recurring task successfully', async () => {
      const recurringTaskData = {
        title: 'Daily Standup',
        description: 'Team standup meeting',
        priority: 'medium',
        recurrence: {
          frequency: 'daily',
          interval: 1,
          maxOccurrences: 10
        },
        dueDate: new Date(Date.now() + 86400000).toISOString() // Tomorrow
      };

      const response = await request(app)
        .post('/api/tasks/recurring')
        .set('x-auth-token', userToken)
        .send(recurringTaskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Recurring task created successfully');
      expect(response.body.data.title).toBe(recurringTaskData.title);
      expect(response.body.data.isRecurring).toBe(true);
      expect(response.body.data.recurrence.frequency).toBe('daily');
      expect(response.body.data.recurrence.interval).toBe(1);
      expect(response.body.data.recurrence.maxOccurrences).toBe(10);
      expect(response.body.data.nextDueDate).toBeDefined();
    });

    it('should create recurring task without maxOccurrences', async () => {
      const recurringTaskData = {
        title: 'Weekly Report',
        description: 'Submit weekly report',
        recurrence: {
          frequency: 'weekly',
          interval: 1
        },
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString() // Next week
      };

      const response = await request(app)
        .post('/api/tasks/recurring')
        .set('x-auth-token', userToken)
        .send(recurringTaskData)
        .expect(201);

      expect(response.body.data.isRecurring).toBe(true);
      expect(response.body.data.recurrence.frequency).toBe('weekly');
      expect(response.body.data.recurrence.maxOccurrences).toBeUndefined();
    });

    it('should return validation error for invalid frequency', async () => {
      const recurringTaskData = {
        title: 'Invalid Task',
        recurrence: {
          frequency: 'invalid',
          interval: 1
        },
        dueDate: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/tasks/recurring')
        .set('x-auth-token', userToken)
        .send(recurringTaskData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return validation error for missing interval', async () => {
      const recurringTaskData = {
        title: 'Missing Interval Task',
        recurrence: {
          frequency: 'daily'
        },
        dueDate: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/tasks/recurring')
        .set('x-auth-token', userToken)
        .send(recurringTaskData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/tasks/:id/recurrence', () => {
    let recurringTaskId;

    beforeEach(async () => {
      const recurringTaskData = {
        title: 'Test Recurring Task',
        recurrence: {
          frequency: 'daily',
          interval: 1,
          maxOccurrences: 5
        },
        dueDate: new Date(Date.now() + 86400000).toISOString()
      };

      const response = await request(app)
        .post('/api/tasks/recurring')
        .set('x-auth-token', userToken)
        .send(recurringTaskData)
        .expect(201);

      recurringTaskId = response.body.data._id;
    });

    it('should update recurrence settings successfully', async () => {
      const updates = {
        recurrence: {
          frequency: 'weekly',
          interval: 2,
          maxOccurrences: 8
        }
      };

      const response = await request(app)
        .patch(`/api/tasks/${recurringTaskId}/recurrence`)
        .set('x-auth-token', userToken)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Recurrence settings updated successfully');
      expect(response.body.data.recurrence.frequency).toBe('weekly');
      expect(response.body.data.recurrence.interval).toBe(2);
      expect(response.body.data.recurrence.maxOccurrences).toBe(8);
    });

    it('should return 404 for non-existent task', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const updates = {
        recurrence: {
          frequency: 'weekly',
          interval: 1
        }
      };

      await request(app)
        .patch(`/api/tasks/${nonExistentId}/recurrence`)
        .set('x-auth-token', userToken)
        .send(updates)
        .expect(404);
    });

    it('should return 403 for non-owner user', async () => {
      const otherUser = await registerAndLogin({
        email: `other${Date.now()}@example.com`
      });

      const updates = {
        recurrence: {
          frequency: 'weekly',
          interval: 1
        }
      };

      await request(app)
        .patch(`/api/tasks/${recurringTaskId}/recurrence`)
        .set('x-auth-token', otherUser.accessToken)
        .send(updates)
        .expect(403);
    });
  });

  describe('GET /api/tasks/:id/instances', () => {
    let recurringTaskId;

    beforeEach(async () => {
      const recurringTaskData = {
        title: 'Parent Recurring Task',
        recurrence: {
          frequency: 'daily',
          interval: 1,
          maxOccurrences: 10
        },
        dueDate: new Date(Date.now() + 86400000).toISOString()
      };

      const response = await request(app)
        .post('/api/tasks/recurring')
        .set('x-auth-token', userToken)
        .send(recurringTaskData)
        .expect(201);

      recurringTaskId = response.body.data._id;

      // Create some instance tasks manually for testing
      await request(app)
        .post('/api/tasks')
        .set('x-auth-token', userToken)
        .send({
          title: 'Instance 1',
          parentTask: recurringTaskId,
          dueDate: new Date().toISOString()
        })
        .expect(201);

      await request(app)
        .post('/api/tasks')
        .set('x-auth-token', userToken)
        .send({
          title: 'Instance 2',
          parentTask: recurringTaskId,
          dueDate: new Date().toISOString()
        })
        .expect(201);
    });

    it('should return paginated instances of recurring task', async () => {
      const response = await request(app)
        .get(`/api/tasks/${recurringTaskId}/instances`)
        .set('x-auth-token', userToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(0);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.current).toBe(1);
    });

    it('should return 404 for non-existent task', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      await request(app)
        .get(`/api/tasks/${nonExistentId}/instances`)
        .set('x-auth-token', userToken)
        .expect(404);
    });

    it('should return 403 for unauthorized user', async () => {
      const otherUser = await registerAndLogin({
        email: `unauthorized${Date.now()}@example.com`
      });

      await request(app)
        .get(`/api/tasks/${recurringTaskId}/instances`)
        .set('x-auth-token', otherUser.accessToken)
        .expect(403);
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get(`/api/tasks/${recurringTaskId}/instances?page=1&limit=5`)
        .set('x-auth-token', userToken)
        .expect(200);

      expect(response.body.pagination.current).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('POST /api/tasks/generate-recurring (Admin only)', () => {
    it('should generate recurring tasks for admin', async () => {
      // Create a recurring task that's due
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
      const recurringTaskData = {
        title: 'Due Recurring Task',
        recurrence: {
          frequency: 'daily',
          interval: 1,
          maxOccurrences: 5
        },
        dueDate: pastDate
      };

      await request(app)
        .post('/api/tasks/recurring')
        .set('x-auth-token', adminToken)
        .send(recurringTaskData)
        .expect(201);

      const response = await request(app)
        .post('/api/tasks/generate-recurring')
        .set('x-auth-token', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('count');
      expect(response.body.data).toHaveProperty('tasks');
      expect(Array.isArray(response.body.data.tasks)).toBe(true);
    });

    it('should forbid non-admin from generating recurring tasks', async () => {
      await request(app)
        .post('/api/tasks/generate-recurring')
        .set('x-auth-token', userToken)
        .expect(403);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/tasks/generate-recurring')
        .expect(401);
    });
  });

  describe('Recurring Task Validation', () => {
    it('should validate required fields for recurring tasks', async () => {
      const invalidData = {
        // Missing title
        recurrence: {
          frequency: 'daily',
          interval: 1
        }
      };

      const response = await request(app)
        .post('/api/tasks/recurring')
        .set('x-auth-token', userToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate interval is positive', async () => {
      const invalidData = {
        title: 'Invalid Interval Task',
        recurrence: {
          frequency: 'daily',
          interval: 0
        },
        dueDate: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/tasks/recurring')
        .set('x-auth-token', userToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate maxOccurrences is positive when provided', async () => {
      const invalidData = {
        title: 'Invalid MaxOccurrences Task',
        recurrence: {
          frequency: 'daily',
          interval: 1,
          maxOccurrences: -1
        },
        dueDate: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/tasks/recurring')
        .set('x-auth-token', userToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});