import { Request, Response, NextFunction } from 'express';
export declare class GoogleAuthController {
    /**
     * GET /auth/google
     * Start Google OAuth flow by redirecting user to Google consent screen
     */
    static redirectToGoogle(req: Request, res: Response, next: NextFunction): void;
    /**
     * GET /auth/google/callback
     * Handle redirect from Google OAuth consent screen
     */
    static handleCallback(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /auth/google/status
     * Get connection status and connected email address
     */
    static getConnectionStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /auth/google/disconnect
     * Disconnect Google account and delete connection details
     */
    static disconnectAccount(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /auth/google/scopes
     * Return the active OAuth scopes for the connected Gmail account
     */
    static getTokenScopes(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=GoogleAuthController.d.ts.map