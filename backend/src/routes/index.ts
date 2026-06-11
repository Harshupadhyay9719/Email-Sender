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
import config from '../config/env';

const router = Router();

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    version: config.api_version,
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/import', importRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/test', testRoutes);

export default router;
