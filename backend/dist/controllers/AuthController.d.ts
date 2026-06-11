/**
 * Authentication Controller
 * Handles user registration, login, and token refresh
 */
import { Request, Response, NextFunction } from 'express';
export declare class AuthController {
    /**
     * POST /auth/register
     * Register a new user
     */
    static register(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /auth/login
     * Login user with email and password
     */
    static login(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /auth/refresh
     * Refresh access token
     */
    static refresh(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /auth/verify
     * Verify current user session
     */
    static verify(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /auth/logout
     * Logout user (frontend-handled, backend just confirms)
     */
    static logout(req: Request, res: Response): void;
}
//# sourceMappingURL=AuthController.d.ts.map