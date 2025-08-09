/**
 * Health Controller
 * Handles health check-related business logic
 */

const { successResponse } = require('../utils/response');
const mongoose = require('mongoose');

class HealthController {
  /**
   * Basic health check
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getHealth (req, res) {
    try {
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        architecture: 'MVC',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
      };

      return successResponse(res, healthData, 'API is running');
    } catch (error) {
      console.error('Health check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Health check failed',
        error: error.message
      });
    }
  }

  /**
   * Detailed health status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDetailedHealth (req, res) {
    try {
      const healthData = {
        status: 'healthy',
        message: 'Health check passed',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        architecture: 'MVC',
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid,
        database: {
          status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
          state: mongoose.connection.readyState,
          name: mongoose.connection.name || 'express_boilerplate'
        }
      };

      return successResponse(res, healthData, 'Health check passed');
    } catch (error) {
      console.error('Detailed health check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Detailed health check failed',
        error: error.message
      });
    }
  }

  /**
   * System information
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSystemInfo (req, res) {
    try {
      const os = require('os');

      const systemInfo = {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem()
        },
        cpu: {
          cores: os.cpus().length,
          model: os.cpus()[0].model
        },
        uptime: os.uptime(),
        loadAverage: os.loadavg()
      };

      return successResponse(res, systemInfo, 'System information retrieved');
    } catch (error) {
      console.error('System info error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get system information',
        error: error.message
      });
    }
  }

  /**
   * Database health check
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDatabaseHealth (req, res) {
    try {
      const startTime = Date.now();

      // Test database connection by running a simple query
      let dbHealth = {
        status: 'unknown',
        connection: 'unknown',
        responseTime: 0,
        lastCheck: new Date().toISOString()
      };

      if (mongoose.connection.readyState === 1) {
        // Database is connected, run a test query
        try {
          await mongoose.connection.db.admin().ping();
          dbHealth = {
            status: 'healthy',
            connection: 'connected',
            responseTime: Date.now() - startTime,
            lastCheck: new Date().toISOString(),
            database: mongoose.connection.name || 'express_boilerplate',
            collections: await mongoose.connection.db.listCollections().toArray()
          };
        } catch (error) {
          dbHealth = {
            status: 'unhealthy',
            connection: 'connected',
            responseTime: Date.now() - startTime,
            lastCheck: new Date().toISOString(),
            error: error.message
          };
        }
      } else {
        dbHealth = {
          status: 'unhealthy',
          connection: 'disconnected',
          responseTime: Date.now() - startTime,
          lastCheck: new Date().toISOString(),
          error: 'Database not connected'
        };
      }

      return successResponse(res, dbHealth, 'Database health check completed');
    } catch (error) {
      console.error('Database health check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database health check failed',
        error: error.message
      });
    }
  }
}

module.exports = new HealthController();
