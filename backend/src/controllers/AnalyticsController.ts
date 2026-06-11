import { Request, Response, NextFunction } from 'express';
import AnalyticsService from '../services/analytics/AnalyticsService';
import { ResponseHandler } from '../utils/responseHandler';
import logger from '../utils/logger';

export class AnalyticsController {
  /**
   * GET /analytics/dashboard
   * Get main dashboard metrics
   */
  static async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new Error('User context missing');
      }

      const metrics = await AnalyticsService.getDashboardMetrics(req.user.userId);
      ResponseHandler.success(res, 200, 'Dashboard metrics retrieved successfully', metrics);
    } catch (error) {
      logger.error('Error in AnalyticsController.getDashboard:', error);
      next(error);
    }
  }

  /**
   * GET /analytics/charts
   * Get historical chart details
   */
  static async getCharts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new Error('User context missing');
      }

      const chartsData = await AnalyticsService.getChartsData(req.user.userId);
      ResponseHandler.success(res, 200, 'Charts analytics retrieved successfully', chartsData);
    } catch (error) {
      logger.error('Error in AnalyticsController.getCharts:', error);
      next(error);
    }
  }
}
