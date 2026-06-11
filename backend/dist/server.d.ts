/**
 * Express Server Setup
 * Main application configuration and middleware setup
 */
import { Express } from 'express';
declare class ExpressServer {
    private app;
    constructor();
    /**
     * Setup middleware
     */
    private setupMiddleware;
    /**
     * Setup API routes
     */
    private setupRoutes;
    /**
     * Setup error handling
     */
    private setupErrorHandling;
    /**
     * Start the server
     */
    start(): Promise<void>;
    /**
     * Stop the server
     */
    stop(): Promise<void>;
    /**
     * Get Express app (useful for testing)
     */
    getApp(): Express;
}
export default ExpressServer;
//# sourceMappingURL=server.d.ts.map