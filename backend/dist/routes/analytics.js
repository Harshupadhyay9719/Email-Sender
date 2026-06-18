"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AnalyticsController_1 = require("../controllers/AnalyticsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
router.use(auth_1.requireOperator);
// Analytics endpoints
router.get('/dashboard', AnalyticsController_1.AnalyticsController.getDashboard);
router.get('/charts', AnalyticsController_1.AnalyticsController.getCharts);
router.get('/reports', AnalyticsController_1.AnalyticsController.getReportsMetrics);
router.get('/activity', AnalyticsController_1.AnalyticsController.getActivity);
router.get('/saved', AnalyticsController_1.AnalyticsController.getSavedReports);
router.get('/export', AnalyticsController_1.AnalyticsController.exportReport);
exports.default = router;
