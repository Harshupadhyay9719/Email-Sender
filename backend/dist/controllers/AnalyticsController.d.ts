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
}
//# sourceMappingURL=AnalyticsController.d.ts.map