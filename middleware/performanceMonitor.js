'use strict';

/**
 * Performance Monitoring Middleware
 * Tracks response times, request counts, and other performance metrics
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        byMethod: {},
        byRoute: {},
        byStatusCode: {}
      },
      responseTimes: {
        total: 0,
        count: 0,
        min: Infinity,
        max: 0,
        p95: 0,
        p99: 0,
        recent: [] // Keep last 1000 response times for percentile calculation
      },
      errors: {
        total: 0,
        byType: {},
        byRoute: {}
      },
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0
      },
      uptime: process.uptime(),
      startTime: Date.now()
    };

    // Update memory metrics every 30 seconds
    setInterval(() => {
      this.updateMemoryMetrics();
    }, 30000);
  }

  updateMemoryMetrics() {
    const memUsage = process.memoryUsage();
    this.metrics.memory = {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
      external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100, // MB
      rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100 // MB
    };
  }

  calculatePercentiles() {
    const { recent } = this.metrics.responseTimes;
    if (recent.length === 0) return;

    const sorted = [...recent].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    this.metrics.responseTimes.p95 = sorted[p95Index] || 0;
    this.metrics.responseTimes.p99 = sorted[p99Index] || 0;
  }

  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const method = req.method;
      const route = req.route ? req.route.path : req.path;

      // Increment request counters
      this.metrics.requests.total++;
      this.metrics.requests.byMethod[method] = (this.metrics.requests.byMethod[method] || 0) + 1;
      this.metrics.requests.byRoute[route] = (this.metrics.requests.byRoute[route] || 0) + 1;

      // Hook into response finish event
      const originalEnd = res.end;
      res.end = (chunk, encoding) => {
        // Calculate response time
        const responseTime = Date.now() - startTime;

        // Update response time metrics
        this.metrics.responseTimes.total += responseTime;
        this.metrics.responseTimes.count++;
        this.metrics.responseTimes.min = Math.min(this.metrics.responseTimes.min, responseTime);
        this.metrics.responseTimes.max = Math.max(this.metrics.responseTimes.max, responseTime);

        // Keep recent response times for percentile calculation (limit to 1000)
        this.metrics.responseTimes.recent.push(responseTime);
        if (this.metrics.responseTimes.recent.length > 1000) {
          this.metrics.responseTimes.recent.shift();
        }

        // Update percentiles every 100 requests
        if (this.metrics.responseTimes.count % 100 === 0) {
          this.calculatePercentiles();
        }

        // Track status codes
        const statusCode = res.statusCode;
        this.metrics.requests.byStatusCode[statusCode] = (this.metrics.requests.byStatusCode[statusCode] || 0) + 1;

        // Track errors (4xx and 5xx)
        if (statusCode >= 400) {
          this.metrics.errors.total++;
          const errorType = statusCode >= 500 ? '5xx' : '4xx';
          this.metrics.errors.byType[errorType] = (this.metrics.errors.byType[errorType] || 0) + 1;
          this.metrics.errors.byRoute[route] = (this.metrics.errors.byRoute[route] || 0) + 1;
        }

        // Add performance headers
        res.set('X-Response-Time', `${responseTime}ms`);
        res.set('X-Request-ID', req.headers['x-request-id'] || Date.now().toString());

        // Call original end function
        originalEnd.call(res, chunk, encoding);
      };

      next();
    };
  }

  getMetrics() {
    this.updateMemoryMetrics();

    const avgResponseTime = this.metrics.responseTimes.count > 0
      ? Math.round(this.metrics.responseTimes.total / this.metrics.responseTimes.count * 100) / 100
      : 0;

    const errorRate = this.metrics.requests.total > 0
      ? Math.round(this.metrics.errors.total / this.metrics.requests.total * 10000) / 100
      : 0;

    const requestsPerSecond = this.metrics.requests.total > 0
      ? Math.round(this.metrics.requests.total / ((Date.now() - this.metrics.startTime) / 1000) * 100) / 100
      : 0;

    return {
      ...this.metrics,
      uptime: Math.round(process.uptime()),
      calculated: {
        avgResponseTime,
        errorRate,
        requestsPerSecond,
        totalRequests: this.metrics.requests.total
      }
    };
  }

  getHealthStatus() {
    const metrics = this.getMetrics();
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: metrics.uptime,
      performance: {
        avgResponseTime: metrics.calculated.avgResponseTime,
        p95ResponseTime: metrics.responseTimes.p95,
        p99ResponseTime: metrics.responseTimes.p99,
        requestsPerSecond: metrics.calculated.requestsPerSecond,
        errorRate: metrics.calculated.errorRate
      },
      memory: metrics.memory,
      requests: {
        total: metrics.requests.total,
        statusCodes: metrics.requests.byStatusCode
      }
    };

    // Determine health status based on metrics
    if (metrics.calculated.avgResponseTime > 1000) {
      health.status = 'degraded';
      health.issues = health.issues || [];
      health.issues.push('High average response time');
    }

    if (metrics.calculated.errorRate > 5) {
      health.status = 'degraded';
      health.issues = health.issues || [];
      health.issues.push('High error rate');
    }

    if (metrics.memory.heapUsed > 512) { // 512MB threshold
      health.status = 'degraded';
      health.issues = health.issues || [];
      health.issues.push('High memory usage');
    }

    return health;
  }

  reset() {
    this.metrics = {
      requests: {
        total: 0,
        byMethod: {},
        byRoute: {},
        byStatusCode: {}
      },
      responseTimes: {
        total: 0,
        count: 0,
        min: Infinity,
        max: 0,
        p95: 0,
        p99: 0,
        recent: []
      },
      errors: {
        total: 0,
        byType: {},
        byRoute: {}
      },
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0
      },
      uptime: process.uptime(),
      startTime: Date.now()
    };
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;