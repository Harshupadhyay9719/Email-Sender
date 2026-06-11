/**
 * Authentication Middleware
 * Validates JWT tokens and enforces role-based access control
 */
import { Request, Response, NextFunction } from 'express';
import { JwtPayload, UserRole } from '../types/index';
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload & {
                userId: string;
            };
        }
    }
}
/**
 * Authenticate JWT token from request header
 */
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Check if user has required role
 */
export declare const authorize: (...allowedRoles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Require admin role
 */
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Require operator or admin role
 */
export declare const requireOperator: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map