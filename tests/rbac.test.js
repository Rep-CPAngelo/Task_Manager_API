'use strict';

const request = require('supertest');
const app = require('../server');

const registerAndLogin = async (overrides = {}) => {
  const user = {
    name: overrides.name || 'RBAC User',
    email: overrides.email || `rbacuser${Math.random().toString(36).slice(2, 7)}@example.com`,
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

describe('RBAC: Admin-only /api/users endpoints', () => {
  let adminToken, userToken, userId;

  beforeAll(async () => {
    // Register admin
    const admin = await registerAndLogin({ email: `admin${Date.now()}@example.com`, role: 'admin', name: 'Admin' });
    adminToken = admin.accessToken;
    console.log('adminToken', adminToken);
    // Register regular user
    const user = await registerAndLogin({ email: `user${Date.now()}@example.com`, role: 'user', name: 'User' });
    userToken = user.accessToken;
    userId = user.user.id;
  });

  it('should allow admin to list all users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('x-auth-token', adminToken)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should forbid non-admin from listing all users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('x-auth-token', userToken)
      .expect(403);
    expect(res.body.success).toBe(false);
  });

  it('should allow admin to get any user by ID', async () => {
    const res = await request(app)
      .get(`/api/users/${userId}`)
      .set('x-auth-token', adminToken)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id', userId);
  });

  it('should forbid non-admin from getting user by ID', async () => {
    const res = await request(app)
      .get(`/api/users/${userId}`)
      .set('x-auth-token', userToken)
      .expect(403);
    expect(res.body.success).toBe(false);
  });

  it('should allow admin to update any user', async () => {
    const res = await request(app)
      .patch(`/api/users/${userId}`)
      .set('x-auth-token', adminToken)
      .send({ name: 'Updated User' })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Updated User');
  });

  it('should forbid non-admin from updating user', async () => {
    const res = await request(app)
      .patch(`/api/users/${userId}`)
      .set('x-auth-token', userToken)
      .send({ name: 'Hacker' })
      .expect(403);
    expect(res.body.success).toBe(false);
  });

  it('should allow admin to delete any user', async () => {
    const res = await request(app)
      .delete(`/api/users/${userId}`)
      .set('x-auth-token', adminToken)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  it('should forbid non-admin from deleting user', async () => {
    // Try to delete admin as non-admin
    const res = await request(app)
      .delete(`/api/users/${userId}`)
      .set('x-auth-token', userToken)
      .expect(403);
    expect(res.body.success).toBe(false);
  });
});
