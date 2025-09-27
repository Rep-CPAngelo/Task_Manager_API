'use strict';

// Helper functions for Artillery load testing

module.exports = {
  loginUser,
  createTestData,
  generateRandomString,
  generateRandomEmail
};

// Login a user and capture the auth token
async function loginUser(context, events, done) {
  const userEmails = [
    'testuser1@example.com',
    'testuser2@example.com',
    'testuser3@example.com'
  ];

  const randomEmail = userEmails[Math.floor(Math.random() * userEmails.length)];

  // Set variables for the current virtual user
  context.vars.email = randomEmail;
  context.vars.password = 'TestPassword123!';

  // Try to login (assuming users exist from previous tests)
  const loginPayload = {
    email: context.vars.email,
    password: context.vars.password
  };

  // This will be handled by Artillery's HTTP engine
  // The token capture is done in the YAML config
  return done();
}

// Create test data for performance testing
function createTestData(context, events, done) {
  context.vars.testTaskTitle = `Performance Task ${generateRandomString(8)}`;
  context.vars.testBoardTitle = `Test Board ${generateRandomString(6)}`;
  context.vars.testDescription = `Generated test data for performance testing - ${Date.now()}`;

  return done();
}

// Generate random string for unique test data
function generateRandomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate random email for testing
function generateRandomEmail() {
  return `testuser${Math.floor(Math.random() * 1000)}@example.com`;
}

// Log performance metrics
function logMetrics(context, events, done) {
  console.log(`[Performance] Virtual User ${context.vars.$uuid} completed scenario`);
  return done();
}