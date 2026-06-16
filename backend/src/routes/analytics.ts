import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController';
import { authenticate, requireOperator } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(requireOperator);

// Analytics endpoints
router.get('/dashboard', AnalyticsController.getDashboard);
router.get('/charts', AnalyticsController.getCharts);
router.get('/reports', AnalyticsController.getReportsMetrics);
router.get('/activity', AnalyticsController.getActivity);
router.get('/saved', AnalyticsController.getSavedReports);
router.get('/export', AnalyticsController.exportReport);

export default router;
