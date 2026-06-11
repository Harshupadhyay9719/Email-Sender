/**
 * Environment Configuration and Validation
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  node_env: string;
  port: number;
  api_version: string;
  log_level: string;
  mongodb_uri: string;
  mongodb_test_uri: string;
  jwt_secret: string;
  jwt_expires_in: string;
  jwt_refresh_secret: string;
  jwt_refresh_expires_in: string;
  redis_host: string;
  redis_port: number;
  redis_password: string;
  redis_db: number;
  aws_region: string;
  aws_s3_bucket: string;
  enable_email_validation: boolean;
  max_file_size: number;
  rate_limit_window_ms: number;
  rate_limit_max_requests: number;
  email_send_delay_min: number;
  email_send_delay_max: number;
  email_daily_limit: number;
  cors_origin: string[];
  google_client_id: string;
  google_client_secret: string;
  google_callback_url: string;
}

const config: Config = {
  node_env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  api_version: process.env.API_VERSION || 'v1',
  log_level: process.env.LOG_LEVEL || 'info',
  mongodb_uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/email-campaign',
  mongodb_test_uri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/email-campaign-test',
  jwt_secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  jwt_expires_in: process.env.JWT_EXPIRES_IN || '1d',
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production',
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  redis_host: process.env.REDIS_HOST || 'localhost',
  redis_port: parseInt(process.env.REDIS_PORT || '6379', 10),
  redis_password: process.env.REDIS_PASSWORD || '',
  redis_db: parseInt(process.env.REDIS_DB || '0', 10),
  aws_region: process.env.AWS_REGION || 'us-east-1',
  aws_s3_bucket: process.env.AWS_S3_BUCKET || 'email-campaign-attachments',
  enable_email_validation: process.env.ENABLE_EMAIL_VALIDATION === 'true',
  max_file_size: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10),
  rate_limit_window_ms: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rate_limit_max_requests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  email_send_delay_min: parseInt(process.env.EMAIL_SEND_DELAY_MIN || '30', 10),
  email_send_delay_max: parseInt(process.env.EMAIL_SEND_DELAY_MAX || '90', 10),
  email_daily_limit: parseInt(process.env.EMAIL_DAILY_LIMIT || '500', 10),
  cors_origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  google_client_id: process.env.GOOGLE_CLIENT_ID || '',
  google_client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
  google_callback_url: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/google/callback',
};

// Validate critical configuration
if (config.node_env === 'production') {
  if (!config.jwt_secret || config.jwt_secret === 'your-super-secret-jwt-key-change-in-production') {
    throw new Error('JWT_SECRET must be set in production');
  }
}

export default config;
