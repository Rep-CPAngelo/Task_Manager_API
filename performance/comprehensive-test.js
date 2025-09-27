const axios = require('axios');
const { performance } = require('perf_hooks');

const BASE_URL = 'http://localhost:3000/api';
const TEST_USER = {
  email: 'testuser1@example.com',
  password: 'TestPassword123!'
};

class ComprehensivePerformanceTest {
  constructor() {
    this.results = [];
    this.authToken = null;
    this.testData = {
      userId: null,
      taskId: null,
      boardId: null
    };
  }

  async login() {
    console.log('🔐 Authenticating...');
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
      this.authToken = response.data.data.accessToken;
      this.testData.userId = response.data.data.user._id;
      console.log('✅ Authentication successful');
      return true;
    } catch (error) {
      console.error('❌ Authentication failed:', error.response?.data?.message || error.message);
      return false;
    }
  }

  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    };
  }

  async measureEndpoint(name, method, url, data = null, iterations = 10) {
    console.log(`\n🔍 Testing: ${name} (${iterations} iterations)`);

    const times = [];
    const errors = [];
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
      try {
        const start = performance.now();

        let response;
        const config = { headers: this.getAuthHeaders() };

        switch (method.toLowerCase()) {
          case 'get':
            response = await axios.get(`${BASE_URL}${url}`, config);
            break;
          case 'post':
            response = await axios.post(`${BASE_URL}${url}`, data, config);
            break;
          case 'patch':
            response = await axios.patch(`${BASE_URL}${url}`, data, config);
            break;
          case 'delete':
            response = await axios.delete(`${BASE_URL}${url}`, config);
            break;
        }

        const end = performance.now();
        const responseTime = end - start;
        times.push(responseTime);
        successCount++;

        // Extract useful data from first successful response
        if (i === 0 && response.data.data) {
          if (name.includes('Task') && response.data.data._id) {
            this.testData.taskId = response.data.data._id;
          }
          if (name.includes('Board') && response.data.data._id) {
            this.testData.boardId = response.data.data._id;
          }
        }

      } catch (error) {
        errors.push({
          iteration: i + 1,
          status: error.response?.status,
          message: error.response?.data?.message || error.message
        });
      }
    }

    if (times.length === 0) {
      console.log(`   ❌ All requests failed`);
      return null;
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

    const result = {
      endpoint: name,
      method: method.toUpperCase(),
      url,
      iterations,
      successCount,
      errorCount: errors.length,
      avgTime: parseFloat(avgTime.toFixed(2)),
      minTime: parseFloat(minTime.toFixed(2)),
      maxTime: parseFloat(maxTime.toFixed(2)),
      p95Time: parseFloat((p95 || 0).toFixed(2)),
      successRate: parseFloat((successCount / iterations * 100).toFixed(2)),
      errors: errors.slice(0, 3) // Keep first 3 errors for analysis
    };

    this.results.push(result);

    console.log(`   ⏱️  Avg: ${avgTime.toFixed(2)}ms | Min: ${minTime.toFixed(2)}ms | Max: ${maxTime.toFixed(2)}ms | Success: ${result.successRate}%`);

    if (errors.length > 0) {
      console.log(`   ⚠️  Errors: ${errors.length}/${iterations}`);
    }

    return result;
  }

  async runAuthenticationTests() {
    console.log('\n🔐 === AUTHENTICATION TESTS ===');

    await this.measureEndpoint(
      'User Login',
      'POST',
      '/auth/login',
      TEST_USER,
      5
    );

    await this.measureEndpoint(
      'Get Profile',
      'GET',
      '/auth/profile',
      null,
      20
    );

    await this.measureEndpoint(
      'Refresh Token',
      'POST',
      '/auth/refresh',
      null,
      10
    );
  }

  async runTaskManagementTests() {
    console.log('\n📋 === TASK MANAGEMENT TESTS ===');

    // Create task
    const taskData = {
      title: `Performance Test Task ${Date.now()}`,
      description: 'This is a performance test task',
      priority: 'medium',
      status: 'pending',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    await this.measureEndpoint(
      'Create Task',
      'POST',
      '/tasks',
      taskData,
      15
    );

    // List tasks
    await this.measureEndpoint(
      'List Tasks',
      'GET',
      '/tasks?page=1&limit=20',
      null,
      25
    );

    // Get specific task
    if (this.testData.taskId) {
      await this.measureEndpoint(
        'Get Task by ID',
        'GET',
        `/tasks/${this.testData.taskId}`,
        null,
        20
      );

      // Update task
      await this.measureEndpoint(
        'Update Task Status',
        'PATCH',
        `/tasks/${this.testData.taskId}/status`,
        { status: 'in-progress' },
        15
      );
    }

    // Search tasks
    await this.measureEndpoint(
      'Search Tasks',
      'GET',
      '/tasks?search=Performance&status=pending',
      null,
      20
    );
  }

  async runBoardManagementTests() {
    console.log('\n📊 === BOARD MANAGEMENT TESTS ===');

    // Create board
    const boardData = {
      title: `Performance Test Board ${Date.now()}`,
      description: 'Performance testing board',
      columns: [
        { title: 'To Do', position: 0, color: '#e74c3c' },
        { title: 'In Progress', position: 1, color: '#f39c12' },
        { title: 'Done', position: 2, color: '#27ae60' }
      ]
    };

    await this.measureEndpoint(
      'Create Board',
      'POST',
      '/boards',
      boardData,
      10
    );

    // List boards
    await this.measureEndpoint(
      'List Boards',
      'GET',
      '/boards',
      null,
      25
    );

    // Get specific board
    if (this.testData.boardId) {
      await this.measureEndpoint(
        'Get Board by ID',
        'GET',
        `/boards/${this.testData.boardId}`,
        null,
        20
      );
    }
  }

  async runAnalyticsTests() {
    console.log('\n📈 === ANALYTICS TESTS ===');

    await this.measureEndpoint(
      'Dashboard Analytics',
      'GET',
      '/analytics/dashboard?period=week',
      null,
      15
    );

    await this.measureEndpoint(
      'User Analytics',
      'GET',
      '/analytics/user?period=month',
      null,
      15
    );

    await this.measureEndpoint(
      'Productivity Insights',
      'GET',
      '/analytics/productivity?period=month',
      null,
      10
    );
  }

  async runHealthAndPerformanceTests() {
    console.log('\n🏥 === HEALTH & PERFORMANCE TESTS ===');

    await this.measureEndpoint(
      'Health Check',
      'GET',
      '/health',
      null,
      50
    );

    await this.measureEndpoint(
      'Health Status',
      'GET',
      '/health/status',
      null,
      25
    );

    await this.measureEndpoint(
      'Performance Health',
      'GET',
      '/performance/health',
      null,
      20
    );
  }

  async runStressTest() {
    console.log('\n💪 === STRESS TEST ===');

    // Concurrent requests to different endpoints
    const concurrentTasks = [
      this.measureEndpoint('Concurrent Health Check', 'GET', '/health', null, 100),
      this.measureEndpoint('Concurrent Task List', 'GET', '/tasks?limit=10', null, 50),
      this.measureEndpoint('Concurrent Board List', 'GET', '/boards', null, 30),
      this.measureEndpoint('Concurrent Analytics', 'GET', '/analytics/dashboard', null, 20)
    ];

    await Promise.all(concurrentTasks);
  }

  generateReport() {
    console.log('\n📊 === COMPREHENSIVE PERFORMANCE REPORT ===');
    console.log('=' .repeat(80));

    // Group results by category
    const categories = {
      'Authentication': this.results.filter(r => r.endpoint.includes('Login') || r.endpoint.includes('Profile') || r.endpoint.includes('Refresh')),
      'Task Management': this.results.filter(r => r.endpoint.includes('Task')),
      'Board Management': this.results.filter(r => r.endpoint.includes('Board')),
      'Analytics': this.results.filter(r => r.endpoint.includes('Analytics') || r.endpoint.includes('Dashboard') || r.endpoint.includes('Productivity')),
      'Health & Performance': this.results.filter(r => r.endpoint.includes('Health') || r.endpoint.includes('Performance')),
      'Stress Test': this.results.filter(r => r.endpoint.includes('Concurrent'))
    };

    for (const [category, results] of Object.entries(categories)) {
      if (results.length === 0) continue;

      console.log(`\n📈 ${category}:`);
      console.log('-'.repeat(60));

      results.forEach(result => {
        const status = result.successRate === 100 ? '✅' : result.successRate > 90 ? '⚠️' : '❌';
        const performance = result.avgTime < 100 ? '🚀' : result.avgTime < 500 ? '📊' : '🐌';

        console.log(`${status}${performance} ${result.endpoint.padEnd(30)} | ${result.avgTime.toString().padStart(8)}ms avg | ${result.p95Time.toString().padStart(8)}ms p95 | ${result.successRate.toString().padStart(6)}% success`);

        if (result.errors.length > 0) {
          result.errors.forEach(error => {
            console.log(`     ⚠️  Error: ${error.status} - ${error.message}`);
          });
        }
      });
    }

    // Overall statistics
    const allResults = this.results.filter(r => r.successRate > 0);
    const avgResponseTime = allResults.reduce((sum, r) => sum + r.avgTime, 0) / allResults.length;
    const avgSuccessRate = allResults.reduce((sum, r) => sum + r.successRate, 0) / allResults.length;
    const slowEndpoints = allResults.filter(r => r.avgTime > 500);
    const errorProneEndpoints = allResults.filter(r => r.successRate < 100);

    console.log('\n⚡ === PERFORMANCE SUMMARY ===');
    console.log('-'.repeat(50));
    console.log(`Overall Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`Overall Success Rate: ${avgSuccessRate.toFixed(2)}%`);
    console.log(`Total Endpoints Tested: ${allResults.length}`);
    console.log(`Slow Endpoints (>500ms): ${slowEndpoints.length}`);
    console.log(`Error-Prone Endpoints: ${errorProneEndpoints.length}`);

    if (slowEndpoints.length > 0) {
      console.log('\n🐌 Slow Endpoints:');
      slowEndpoints.forEach(endpoint => {
        console.log(`   - ${endpoint.endpoint}: ${endpoint.avgTime}ms`);
      });
    }

    if (errorProneEndpoints.length > 0) {
      console.log('\n❌ Error-Prone Endpoints:');
      errorProneEndpoints.forEach(endpoint => {
        console.log(`   - ${endpoint.endpoint}: ${endpoint.successRate}% success rate`);
      });
    }

    // Performance recommendations
    console.log('\n💡 === RECOMMENDATIONS ===');
    console.log('-'.repeat(50));

    if (avgResponseTime > 300) {
      console.log('🔧 Consider implementing caching for frequently accessed data');
      console.log('🔧 Review database queries and add appropriate indexes');
    }

    if (avgSuccessRate < 99) {
      console.log('🔧 Investigate and fix reliability issues');
      console.log('🔧 Implement better error handling and retry mechanisms');
    }

    if (slowEndpoints.length > 0) {
      console.log('🔧 Optimize slow endpoints with pagination, filtering, or caching');
    }

    console.log('\n📊 Raw results saved for further analysis');
    return {
      summary: {
        avgResponseTime,
        avgSuccessRate,
        totalEndpoints: allResults.length,
        slowEndpoints: slowEndpoints.length,
        errorProneEndpoints: errorProneEndpoints.length
      },
      results: this.results,
      recommendations: {
        needsCaching: avgResponseTime > 300,
        needsReliabilityFix: avgSuccessRate < 99,
        needsOptimization: slowEndpoints.length > 0
      }
    };
  }

  async run() {
    console.log('🚀 Starting Comprehensive Performance Test...');
    console.log('⏰ This may take several minutes...\n');

    const startTime = Date.now();

    try {
      // Authentication is required for most endpoints
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        console.error('❌ Cannot proceed without authentication');
        return;
      }

      // Run all test suites
      await this.runAuthenticationTests();
      await this.runTaskManagementTests();
      await this.runBoardManagementTests();
      await this.runAnalyticsTests();
      await this.runHealthAndPerformanceTests();
      await this.runStressTest();

      // Generate comprehensive report
      const report = this.generateReport();

      // Save results
      const fs = require('fs');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = `./performance/comprehensive-test-results-${timestamp}.json`;

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      const totalTime = Date.now() - startTime;
      console.log(`\n🎉 Performance test completed in ${(totalTime / 1000).toFixed(2)} seconds`);
      console.log(`📁 Results saved to: ${reportPath}`);

    } catch (error) {
      console.error('❌ Performance test failed:', error.message);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const test = new ComprehensivePerformanceTest();
  test.run();
}

module.exports = { ComprehensivePerformanceTest };