/**
 * Main Routes Aggregator
 * Combines all API routes
 */

import { Router, Request, Response } from 'express';
import authRoutes from './auth';
import organizationRoutes from './organizations';
import campaignRoutes from './campaigns';
import importRoutes from './import';
import analyticsRoutes from './analytics';
import testRoutes from './test';
import adminRoutes from './admin';
import config from '../config/env';

import mongoose from 'mongoose';

const router = Router();

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStates: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const isHealthy = dbStatus === 1;
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'unhealthy',
    timestamp: new Date(),
    version: config.api_version,
    plugs: {
      database: dbStates[dbStatus] || 'unknown',
      emailWorker: 'running (direct-send)'
    }
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/import', importRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/test', testRoutes);
router.use('/admin', adminRoutes);

export default router;
