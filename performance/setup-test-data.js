const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Task = require('../models/Task');
const Board = require('../models/Board');

// Test data configuration
const TEST_USERS_COUNT = 10;
const TEST_TASKS_PER_USER = 50;
const TEST_BOARDS_PER_USER = 5;

async function setupTestData() {
  try {
    console.log('🔧 Setting up performance test data...');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing test data
    console.log('🧹 Cleaning up existing test data...');
    await User.deleteMany({ email: { $regex: /^testuser\d+@example\.com$/ } });
    await Task.deleteMany({ title: { $regex: /^Performance/ } });
    await Board.deleteMany({ title: { $regex: /^Test Board/ } });

    console.log('👥 Creating test users...');
    const testUsers = [];
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

    for (let i = 1; i <= TEST_USERS_COUNT; i++) {
      const user = new User({
        name: `Test User ${i}`,
        email: `testuser${i}@example.com`,
        password: hashedPassword,
        role: 'user'
      });
      await user.save();
      testUsers.push(user);
    }

    console.log(`✅ Created ${TEST_USERS_COUNT} test users`);

    console.log('📋 Creating test tasks...');
    let totalTasks = 0;
    for (const user of testUsers) {
      const tasks = [];
      for (let i = 1; i <= TEST_TASKS_PER_USER; i++) {
        tasks.push({
          title: `Performance Task ${i} for ${user.name}`,
          description: `This is a performance test task #${i} created for load testing`,
          status: ['pending', 'in-progress', 'completed'][Math.floor(Math.random() * 3)],
          priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
          createdBy: user._id,
          assignedTo: user._id,
          dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within 30 days
          labels: ['performance', 'testing', 'automated'],
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Created within last 7 days
        });
      }
      await Task.insertMany(tasks);
      totalTasks += tasks.length;
    }

    console.log(`✅ Created ${totalTasks} test tasks`);

    console.log('📊 Creating test boards...');
    let totalBoards = 0;
    for (const user of testUsers) {
      const boards = [];
      for (let i = 1; i <= TEST_BOARDS_PER_USER; i++) {
        boards.push({
          title: `Test Board ${i} - ${user.name}`,
          description: `Performance test board #${i} for load testing`,
          owner: user._id,
          columns: [
            {
              title: 'To Do',
              position: 0,
              color: '#e74c3c',
              wipLimit: null
            },
            {
              title: 'In Progress',
              position: 1,
              color: '#f39c12',
              wipLimit: 3
            },
            {
              title: 'Review',
              position: 2,
              color: '#3498db',
              wipLimit: 2
            },
            {
              title: 'Done',
              position: 3,
              color: '#27ae60',
              wipLimit: null
            }
          ],
          members: [{
            user: user._id,
            role: 'owner',
            addedAt: new Date()
          }],
          visibility: 'private',
          settings: {
            enableWipLimits: true,
            autoArchiveCompleted: false,
            autoArchiveDays: 30
          }
        });
      }
      await Board.insertMany(boards);
      totalBoards += boards.length;
    }

    console.log(`✅ Created ${totalBoards} test boards`);

    // Create some analytics-friendly data with varied dates
    console.log('📈 Creating analytics test data...');
    const analyticsUsers = testUsers.slice(0, 3);
    for (const user of analyticsUsers) {
      const analyticsTasks = [];
      for (let i = 0; i < 100; i++) {
        const createdDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000); // Last 90 days
        const completedDate = Math.random() > 0.3 ?
          new Date(createdDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) :
          null;

        analyticsTasks.push({
          title: `Analytics Task ${i} - ${user.name}`,
          description: `Analytics test data for performance metrics`,
          status: completedDate ? 'completed' : ['pending', 'in-progress'][Math.floor(Math.random() * 2)],
          priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
          createdBy: user._id,
          assignedTo: user._id,
          createdAt: createdDate,
          updatedAt: completedDate || createdDate,
          completedAt: completedDate,
          labels: ['analytics', 'metrics', 'performance']
        });
      }
      await Task.insertMany(analyticsTasks);
    }

    console.log('✅ Created analytics test data');

    console.log('\n🎉 Performance test data setup completed!');
    console.log(`📊 Summary:`);
    console.log(`   - Users: ${TEST_USERS_COUNT}`);
    console.log(`   - Tasks: ${totalTasks + (analyticsUsers.length * 100)}`);
    console.log(`   - Boards: ${totalBoards}`);
    console.log(`   - Test users: testuser1@example.com - testuser${TEST_USERS_COUNT}@example.com`);
    console.log(`   - Password: TestPassword123!`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error setting up test data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupTestData();
}

module.exports = { setupTestData };