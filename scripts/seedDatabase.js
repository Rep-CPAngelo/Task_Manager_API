'use strict';

const dotenv = require('dotenv');
dotenv.config();

const database = require('../config/database');
const User = require('../models/User');

const sampleUsers = [
  {
    name: 'System Admin',
    email: 'admin@example.com',
    password: 'Admin@123456',
    role: 'admin',
    isActive: true
  },
  {
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: 'Password@123',
    role: 'user',
    isActive: true
  },
  {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    password: 'Password@123',
    role: 'user',
    isActive: false
  }
];

async function seedUsers (options = { reset: false }) {
  const { reset } = options;

  console.log('🔧 Seeding users...');
  await database.connect();

  try {
    if (reset) {
      console.log('🗑️  Clearing existing users...');
      await User.deleteMany({});
    }

    let createdCount = 0;
    let skippedCount = 0;

    for (const userData of sampleUsers) {
      // Skip if user already exists
      const existing = await User.findOne({ email: userData.email });
      if (existing) {
        skippedCount += 1;
        continue;
      }

      // Using create() so pre-save hooks (password hashing, email checks) run
      await User.create(userData);
      createdCount += 1;
    }

    console.log('✅ Seeding complete');
    console.log(`👤 Users created: ${createdCount}`);
    console.log(`↩️  Users skipped (already existed): ${skippedCount}`);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    if (process.env.NODE_ENV === 'test') throw error;
    process.exitCode = 1;
  } finally {
    await database.disconnect();
  }
}

const shouldReset = process.argv.includes('--reset') || process.argv.includes('-r');

seedUsers({ reset: shouldReset })
  .catch((err) => {
    console.error('❌ Unexpected error during seeding:', err);
    process.exitCode = 1;
  });


