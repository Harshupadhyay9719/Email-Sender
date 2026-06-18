/**
 * Authentication Middleware
 * Validates JWT tokens and enforces role-based access control
 */

import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/auth/AuthService';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { JwtPayload, UserRole } from '../types/index';
import { User } from '../models/index';
import logger from '../utils/logger';

// Extend Express Request type to include user information
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { userId: string };
    }
  }
}

/**
 * Authenticate JWT token from request header
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.substring(7);
    const decoded = AuthService.verifyAccessToken(token);

    // Verify user in database to enforce active status and role changes in real time
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (!user.isActive) {
      throw new AuthenticationError('User account is deactivated');
    }

    req.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    next(error);
  }
};

/**
 * Check if user has required role
 */
export const authorize =
  (...allowedRoles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new AuthorizationError(
          `User role "${req.user.role}" is not authorized for this action`
        );
      }

      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      next(error);
    }
  };

/**
 * Require admin role
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  authorize('Admin')(req, res, next);
};

/**
 * Require operator or admin role
 */
export const requireOperator = (req: Request, res: Response, next: NextFunction): void => {
  authorize('Admin', 'Operator')(req, res, next);
};
