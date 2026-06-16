/**
 * Express Server Setup
 * Main application configuration and middleware setup
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuid } from 'uuid';
import config from './config/env';
import Database from './config/database';
import routes from './routes/index';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { startEmailWorker, stopEmailWorker } from './queue/emailWorker';
import logger from './utils/logger';

class ExpressServer {
  private app: Express;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Trust proxy
    this.app.set('trust proxy', 1);

    // Request ID middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const requestId = req.headers['x-request-id'] as string || uuid();
      req.headers['x-request-id'] = requestId;
      res.setHeader('x-request-id', requestId);
      next();
    });

    // Logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const requestId = req.headers['x-request-id'] as string;
      logger.info(
        `[${requestId}] ${req.method} ${req.path} - ${req.ip}`
      );
      next();
    });

    // Body parser middleware
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // CORS middleware
    this.app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          if (config.node_env === 'development') {
            return callback(null, true);
          }
          if (config.cors_origin.indexOf(origin) !== -1 || config.cors_origin.includes('*')) {
            return callback(null, true);
          }
          callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        optionsSuccessStatus: 200,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
      })
    );

    // Security middleware
    this.app.use(helmet());

    // Additional security headers
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    const apiPrefix = `/api/${config.api_version}`;
    this.app.use(apiPrefix, routes);

    // Root path handler
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        message: 'Email Campaign API is running',
        version: config.api_version,
        health: '/api/health',
      });
    });

    // For backwards compatibility
    this.app.use('/api/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: new Date(),
        version: config.api_version,
      });
    });
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler (must be last)
    this.app.use(errorHandler);
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      // Connect to database
      await Database.connect();
      startEmailWorker();

      // Start listening
      this.app.listen(config.port, () => {
        logger.info(`✓ Server running on port ${config.port}`);
        logger.info(`✓ Open in browser → http://localhost:${config.port}`);
        logger.info(`✓ API Base URL    → http://localhost:${config.port}/api/${config.api_version}`);
        logger.info(`✓ Health Check    → http://localhost:${config.port}/api/health`);
        logger.info(`✓ Environment: ${config.node_env}`);
        logger.info(`✓ API Version: ${config.api_version}`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    try {
      await stopEmailWorker();
      await Database.disconnect();
      logger.info('✓ Server stopped');
    } catch (error) {
      logger.error('Error stopping server:', error);
      throw error;
    }
  }

  /**
   * Get Express app (useful for testing)
   */
  getApp(): Express {
    return this.app;
  }
}

export default ExpressServer;
