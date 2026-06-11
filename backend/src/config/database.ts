/**
 * MongoDB Database Connection and Configuration
 */

import mongoose from 'mongoose';
import dns from 'dns';
import config from './env';
import logger from '../utils/logger';

class Database {
  static async connect(): Promise<void> {
    try {
      try {
        dns.setServers(['8.8.8.8', '1.1.1.1']);
      } catch (dnsErr) {
        logger.warn('Failed to set DNS servers:', dnsErr);
      }
      const uri = config.node_env === 'test' ? config.mongodb_test_uri : config.mongodb_uri;

      console.log("Mongo URI:", uri);

      await mongoose.connect(uri, {
        maxPoolSize: 10,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        retryWrites: true,
        w: 'majority',
      });

      logger.info('✓ MongoDB connected successfully');

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      logger.error(
        'MongoDB is required before starting the backend. Start Docker Desktop and run "npm run docker:up" from the project root, or run MongoDB locally on the configured MONGODB_URI.'
      );
      process.exit(1);
    }
  }

  static async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
      logger.info('✓ MongoDB disconnected');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  static async dropDatabase(): Promise<void> {
    try {
      await mongoose.connection.dropDatabase();
      logger.info('✓ Database dropped');
    } catch (error) {
      logger.error('Error dropping database:', error);
      throw error;
    }
  }
}

export default Database;
