// Test setup file
require('dotenv').config({ path: 'env.example' });

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';

let mongoServer;

beforeAll(async () => {
  jest.setTimeout(60000);
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  await mongoose.connect(uri, { dbName: 'task_manager_api_test' });
});

afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
  } finally {
    if (mongoServer) {
      await mongoServer.stop();
    }
  }
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});
