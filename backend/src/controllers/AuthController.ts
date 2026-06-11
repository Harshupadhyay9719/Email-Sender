/**
 * Authentication Controller
 * Handles user registration, login, and token refresh
 */

import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/auth/AuthService';
import { ResponseHandler } from '../utils/responseHandler';
import { ValidationError } from '../utils/errors';
import logger from '../utils/logger';

export class AuthController {
  /**
   * POST /auth/register
   * Register a new user
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        throw new ValidationError('Email, password, firstName, and lastName are required');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new ValidationError('Invalid email format');
      }

      const result = await AuthService.register(email, password, firstName, lastName);

      ResponseHandler.created(res, result, 'User registered successfully');
    } catch (error) {
      logger.error('Registration error:', error);
      next(error);
    }
  }

  /**
   * POST /auth/login
   * Login user with email and password
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        throw new ValidationError('Email and password are required');
      }

      const result = await AuthService.login(email, password);

      ResponseHandler.success(res, 200, 'Login successful', result);
    } catch (error) {
      logger.error('Login error:', error);
      next(error);
    }
  }

  /**
   * POST /auth/refresh
   * Refresh access token
   */
  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ValidationError('Refresh token is required');
      }

      const result = await AuthService.refreshAccessToken(refreshToken);

      ResponseHandler.success(res, 200, 'Token refreshed', result);
    } catch (error) {
      logger.error('Token refresh error:', error);
      next(error);
    }
  }

  /**
   * POST /auth/verify
   * Verify current user session
   */
  static async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const user = await AuthService.verifyUser(req.user.userId);

      ResponseHandler.success(res, 200, 'User verified', { user });
    } catch (error) {
      logger.error('User verification error:', error);
      next(error);
    }
  }

  /**
   * POST /auth/logout
   * Logout user (frontend-handled, backend just confirms)
   */
  static logout(req: Request, res: Response): void {
    ResponseHandler.success(res, 200, 'Logged out successfully', null);
  }
}
