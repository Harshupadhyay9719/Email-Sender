"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const AnalyticsService_1 = __importDefault(require("../services/analytics/AnalyticsService"));
const responseHandler_1 = require("../utils/responseHandler");
const logger_1 = __importDefault(require("../utils/logger"));
class AnalyticsController {
    /**
     * GET /analytics/dashboard
     * Get main dashboard metrics
     */
    static async getDashboard(req, res, next) {
        try {
            if (!req.user) {
                throw new Error('User context missing');
            }
            const metrics = await AnalyticsService_1.default.getDashboardMetrics(req.user.userId);
            responseHandler_1.ResponseHandler.success(res, 200, 'Dashboard metrics retrieved successfully', metrics);
        }
        catch (error) {
            logger_1.default.error('Error in AnalyticsController.getDashboard:', error);
            next(error);
        }
    }
    /**
     * GET /analytics/charts
     * Get historical chart details
     */
    static async getCharts(req, res, next) {
        try {
            if (!req.user) {
                throw new Error('User context missing');
            }
            const chartsData = await AnalyticsService_1.default.getChartsData(req.user.userId);
            responseHandler_1.ResponseHandler.success(res, 200, 'Charts analytics retrieved successfully', chartsData);
        }
        catch (error) {
            logger_1.default.error('Error in AnalyticsController.getCharts:', error);
            next(error);
        }
    }
}
exports.AnalyticsController = AnalyticsController;
//# sourceMappingURL=AnalyticsController.js.map