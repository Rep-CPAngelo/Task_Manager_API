'use strict';

const request = require('supertest');
const app = require('../server');

const registerAndLogin = async (overrides = {}) => {
  const user = {
    name: 'Task User',
    email: `taskuser${Math.random().toString(36).slice(2, 7)}@example.com`,
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

describe('Tasks Routes', () => {
  it('should create, list, get, update status and delete a task', async () => {
    const { accessToken, user } = await registerAndLogin();

    // Create task
    const createRes = await request(app)
      .post('/api/tasks')
      .set('x-auth-token', accessToken)
      .send({ title: 'My Task', description: 'Do something' })
      .expect(201);

    const taskId = createRes.body.data._id;

    // List tasks
    const listRes = await request(app)
      .get('/api/tasks')
      .set('x-auth-token', accessToken)
      .expect(200);

    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

    // Get task by id
    const getRes = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('x-auth-token', accessToken)
      .expect(200);

    expect(getRes.body.data.title).toBe('My Task');

    // Update status
    const statusRes = await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set('x-auth-token', accessToken)
      .send({ status: 'completed' })
      .expect(200);

    expect(statusRes.body.data.status).toBe('completed');

    // Delete (soft)
    await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('x-auth-token', accessToken)
      .expect(200);

    // Verify not found after delete
    await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('x-auth-token', accessToken)
      .expect(404);
  });

  it('should handle comments, attachments, subtasks and activity feed', async () => {
    const { accessToken } = await registerAndLogin({ email: `user${Date.now()}@example.com` });

    const createRes = await request(app)
      .post('/api/tasks')
      .set('x-auth-token', accessToken)
      .send({ title: 'Composite Task' })
      .expect(201);
    const taskId = createRes.body.data._id;

    // Add comment
    const commentRes = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set('x-auth-token', accessToken)
      .send({ text: 'First comment' })
      .expect(200);
    expect(commentRes.body.data.comments.some(c => c.text === 'First comment')).toBe(true);

    // Add attachment
    const attachRes = await request(app)
      .post(`/api/tasks/${taskId}/attachments`)
      .set('x-auth-token', accessToken)
      .send({ url: 'https://example.com/file.pdf' })
      .expect(200);
    expect(attachRes.body.data.attachments.includes('https://example.com/file.pdf')).toBe(true);

    // Add subtask
    const subAddRes = await request(app)
      .post(`/api/tasks/${taskId}/subtasks`)
      .set('x-auth-token', accessToken)
      .send({ title: 'Sub 1' })
      .expect(200);
    const subId = subAddRes.body.data.subtasks[0]._id;

    // Update subtask
    const subUpdRes = await request(app)
      .patch(`/api/tasks/${taskId}/subtasks/${subId}`)
      .set('x-auth-token', accessToken)
      .send({ status: 'completed' })
      .expect(200);
    expect(subUpdRes.body.data.subtasks[0].status).toBe('completed');

    // Activity feed should have items
    const activityRes = await request(app)
      .get(`/api/tasks/${taskId}/activity`)
      .set('x-auth-token', accessToken)
      .expect(200);
    expect(activityRes.body.data.length).toBeGreaterThan(0);
    expect(activityRes.body.pagination).toBeDefined();
  });
});


