import { Request, Response, NextFunction } from 'express';
export declare class AnalyticsController {
    /**
     * GET /analytics/dashboard
     * Get main dashboard metrics
     */
    static getDashboard(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /analytics/charts
     * Get historical chart details
     */
    static getCharts(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /analytics/reports
     * Get metrics specific to reports view
     */
    static getReportsMetrics(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /analytics/activity
     * Get weekly campaign activity distribution for chart
     */
    static getActivity(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /analytics/saved
     * Get saved audit report views
     */
    static getSavedReports(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /analytics/export
     * Generate and export email outreach report as CSV file
     */
    static exportReport(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=AnalyticsController.d.ts.map