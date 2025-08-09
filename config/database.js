const mongoose = require('mongoose');

/**
 * Database configuration and connection
 */
class Database {
  constructor () {
    this.uri = process.env.MONGODB_URI;
    this.dbName = process.env.MONGODB_DB_NAME || 'express_boilerplate';
  }

  /**
   * Connect to MongoDB
   */
  async connect () {
    try {
      const options = {
        dbName: this.dbName,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
      };

      await mongoose.connect(this.uri, options);

      console.log('✅ MongoDB connected successfully');
      console.log(`📊 Database: ${this.dbName}`);

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️  MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      if (process.env.NODE_ENV === 'test') {
        throw error; // Re-throw for tests instead of exiting
      }
      process.exit(1);
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect () {
    try {
      await mongoose.connection.close();
      console.log('🔌 MongoDB disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
    }
  }

  /**
   * Get connection status
   */
  getStatus () {
    return {
      connected: mongoose.connection.readyState === 1,
      state: mongoose.connection.readyState,
      database: this.dbName
    };
  }
}

module.exports = new Database();
