const mongoose = require('mongoose');
const { performance } = require('perf_hooks');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Task = require('../models/Task');
const Board = require('../models/Board');

class DatabaseBenchmark {
  constructor() {
    this.results = [];
  }

  async connect() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📊 Connected to MongoDB for benchmarking');
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log('📊 Disconnected from MongoDB');
  }

  async measureOperation(name, operation, iterations = 1) {
    console.log(`\n🔍 Testing: ${name} (${iterations} iterations)`);

    const times = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await operation();
      const end = performance.now();
      times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    const result = {
      operation: name,
      iterations,
      avgTime: parseFloat(avgTime.toFixed(2)),
      minTime: parseFloat(minTime.toFixed(2)),
      maxTime: parseFloat(maxTime.toFixed(2)),
      totalTime: parseFloat((times.reduce((a, b) => a + b, 0)).toFixed(2))
    };

    this.results.push(result);
    console.log(`   ⏱️  Avg: ${avgTime.toFixed(2)}ms | Min: ${minTime.toFixed(2)}ms | Max: ${maxTime.toFixed(2)}ms`);

    return result;
  }

  async runUserOperationsBenchmark() {
    console.log('\n👥 === USER OPERATIONS BENCHMARK ===');

    // Test user lookup by email
    await this.measureOperation(
      'User lookup by email',
      () => User.findOne({ email: 'testuser1@example.com' }),
      100
    );

    // Test user lookup by ID
    const user = await User.findOne({ email: 'testuser1@example.com' });
    await this.measureOperation(
      'User lookup by ID',
      () => User.findById(user._id),
      100
    );

    // Test user search with regex
    await this.measureOperation(
      'User search with regex',
      () => User.find({ name: { $regex: /Test User/, $options: 'i' } }).limit(10),
      50
    );

    // Test user creation
    await this.measureOperation(
      'User creation',
      async () => {
        const testUser = new User({
          name: `Benchmark User ${Date.now()}`,
          email: `benchmark_${Date.now()}@example.com`,
          password: 'hashedpassword'
        });
        await testUser.save();
        await User.deleteOne({ _id: testUser._id });
      },
      10
    );
  }

  async runTaskOperationsBenchmark() {
    console.log('\n📋 === TASK OPERATIONS BENCHMARK ===');

    const user = await User.findOne({ email: 'testuser1@example.com' });

    // Test task creation
    await this.measureOperation(
      'Task creation',
      async () => {
        const task = new Task({
          title: `Benchmark Task ${Date.now()}`,
          description: 'Benchmark test task',
          createdBy: user._id,
          assignedTo: user._id,
          status: 'pending',
          priority: 'medium'
        });
        await task.save();
        await Task.deleteOne({ _id: task._id });
      },
      25
    );

    // Test task query with filters
    await this.measureOperation(
      'Task query with filters',
      () => Task.find({
        assignedTo: user._id,
        status: { $in: ['pending', 'in-progress'] }
      }).limit(20),
      100
    );

    // Test task aggregation (user analytics)
    await this.measureOperation(
      'Task analytics aggregation',
      () => Task.aggregate([
        { $match: { assignedTo: user._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgPriority: { $avg: { $cond: [
              { $eq: ['$priority', 'high'] }, 3,
              { $cond: [{ $eq: ['$priority', 'medium'] }, 2, 1] }
            ]}}
          }
        }
      ]),
      50
    );

    // Test task search with text
    await this.measureOperation(
      'Task text search',
      () => Task.find({
        $or: [
          { title: { $regex: /Performance/, $options: 'i' } },
          { description: { $regex: /test/, $options: 'i' } }
        ]
      }).limit(20),
      50
    );

    // Test task update
    const sampleTask = await Task.findOne({ createdBy: user._id });
    if (sampleTask) {
      await this.measureOperation(
        'Task status update',
        () => Task.findByIdAndUpdate(
          sampleTask._id,
          { status: 'in-progress', updatedAt: new Date() },
          { new: true }
        ),
        50
      );
    }
  }

  async runBoardOperationsBenchmark() {
    console.log('\n📊 === BOARD OPERATIONS BENCHMARK ===');

    const user = await User.findOne({ email: 'testuser1@example.com' });

    // Test board creation
    await this.measureOperation(
      'Board creation',
      async () => {
        const board = new Board({
          title: `Benchmark Board ${Date.now()}`,
          description: 'Benchmark test board',
          owner: user._id,
          columns: [
            { title: 'To Do', position: 0, color: '#e74c3c' },
            { title: 'Done', position: 1, color: '#27ae60' }
          ],
          members: [{ user: user._id, role: 'owner', addedAt: new Date() }]
        });
        await board.save();
        await Board.deleteOne({ _id: board._id });
      },
      10
    );

    // Test board query with population
    await this.measureOperation(
      'Board query with member population',
      () => Board.find({ owner: user._id })
        .populate('members.user', 'name email')
        .limit(10),
      50
    );

    // Test board aggregation
    await this.measureOperation(
      'Board statistics aggregation',
      () => Board.aggregate([
        { $match: { owner: user._id } },
        {
          $project: {
            title: 1,
            columnCount: { $size: '$columns' },
            memberCount: { $size: '$members' },
            createdAt: 1
          }
        }
      ]),
      25
    );
  }

  async runComplexQueriesBenchmark() {
    console.log('\n🔄 === COMPLEX QUERIES BENCHMARK ===');

    const user = await User.findOne({ email: 'testuser1@example.com' });

    // Test complex analytics query (dashboard data)
    await this.measureOperation(
      'Dashboard analytics query',
      async () => {
        const [taskStats, boardStats] = await Promise.all([
          Task.aggregate([
            { $match: { assignedTo: user._id } },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                completed: {
                  $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                pending: {
                  $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                },
                inProgress: {
                  $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] }
                }
              }
            }
          ]),
          Board.countDocuments({ owner: user._id })
        ]);
        return { taskStats, boardStats };
      },
      25
    );

    // Test productivity metrics query
    await this.measureOperation(
      'Productivity metrics query',
      () => Task.aggregate([
        {
          $match: {
            assignedTo: user._id,
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            created: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),
      20
    );

    // Test cross-collection query
    await this.measureOperation(
      'Cross-collection query (boards with task counts)',
      () => Board.aggregate([
        { $match: { owner: user._id } },
        {
          $lookup: {
            from: 'tasks',
            localField: '_id',
            foreignField: 'boardId',
            as: 'tasks'
          }
        },
        {
          $project: {
            title: 1,
            taskCount: { $size: '$tasks' },
            memberCount: { $size: '$members' }
          }
        }
      ]),
      20
    );
  }

  async generateReport() {
    console.log('\n📊 === PERFORMANCE BENCHMARK REPORT ===');
    console.log('=' .repeat(60));

    // Group results by category
    const categories = {
      'User Operations': this.results.filter(r => r.operation.includes('User')),
      'Task Operations': this.results.filter(r => r.operation.includes('Task')),
      'Board Operations': this.results.filter(r => r.operation.includes('Board')),
      'Complex Queries': this.results.filter(r => r.operation.includes('Dashboard') || r.operation.includes('Productivity') || r.operation.includes('Cross-collection'))
    };

    for (const [category, results] of Object.entries(categories)) {
      if (results.length === 0) continue;

      console.log(`\n📈 ${category}:`);
      console.log('-'.repeat(50));

      results.forEach(result => {
        const opsPerSec = result.iterations > 1 ?
          (1000 / result.avgTime * result.iterations / result.iterations).toFixed(1) :
          (1000 / result.avgTime).toFixed(1);

        console.log(`${result.operation.padEnd(35)} | ${result.avgTime.toString().padStart(8)}ms avg | ${opsPerSec.toString().padStart(8)} ops/sec`);
      });
    }

    // Performance thresholds and recommendations
    console.log('\n⚡ === PERFORMANCE ANALYSIS ===');
    console.log('-'.repeat(50));

    const slowOperations = this.results.filter(r => r.avgTime > 100);
    if (slowOperations.length > 0) {
      console.log('\n⚠️  Slow Operations (>100ms average):');
      slowOperations.forEach(op => {
        console.log(`   - ${op.operation}: ${op.avgTime}ms`);
      });
    }

    const fastOperations = this.results.filter(r => r.avgTime < 10);
    if (fastOperations.length > 0) {
      console.log('\n✅ Fast Operations (<10ms average):');
      fastOperations.forEach(op => {
        console.log(`   - ${op.operation}: ${op.avgTime}ms`);
      });
    }

    // Calculate overall statistics
    const totalOperations = this.results.reduce((sum, r) => sum + r.iterations, 0);
    const totalTime = this.results.reduce((sum, r) => sum + r.totalTime, 0);
    const avgResponseTime = totalTime / totalOperations;

    console.log('\n📊 Overall Statistics:');
    console.log(`   Total Operations: ${totalOperations}`);
    console.log(`   Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   Operations Per Second: ${(1000 / avgResponseTime).toFixed(1)}`);

    return {
      results: this.results,
      summary: {
        totalOperations,
        totalTime,
        avgResponseTime,
        opsPerSecond: 1000 / avgResponseTime
      }
    };
  }
}

async function runDatabaseBenchmark() {
  const benchmark = new DatabaseBenchmark();

  try {
    await benchmark.connect();

    await benchmark.runUserOperationsBenchmark();
    await benchmark.runTaskOperationsBenchmark();
    await benchmark.runBoardOperationsBenchmark();
    await benchmark.runComplexQueriesBenchmark();

    const report = await benchmark.generateReport();

    // Save results to file
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `./performance/benchmark-results-${timestamp}.json`;

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Benchmark results saved to: ${reportPath}`);

  } catch (error) {
    console.error('❌ Benchmark error:', error);
  } finally {
    await benchmark.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  runDatabaseBenchmark();
}

module.exports = { DatabaseBenchmark };