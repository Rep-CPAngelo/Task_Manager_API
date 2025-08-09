// Test setup file
require('dotenv').config({ path: 'env.example' });

// Set test environment
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console
  // Uncomment to suppress console.log during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Global cleanup function
global.cleanup = async () => {
  const mongoose = require('mongoose');

  // Close all mongoose connections
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.connection.close();
      console.log('✅ Database connection closed');
    } catch (error) {
      console.error('❌ Error closing database connection:', error);
    }
  }

  // Wait a bit for connections to close
  await new Promise(resolve => setTimeout(resolve, 1000));
};

// Cleanup function to be called after all tests
afterAll(async () => {
  await global.cleanup();
});

// Handle process exit
process.on('SIGINT', async () => {
  await global.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await global.cleanup();
  process.exit(0);
});

// Set test port to avoid conflicts
process.env.PORT = '3001';
