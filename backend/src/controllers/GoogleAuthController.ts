import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/auth/AuthService';
import GmailService from '../services/email/GmailService';
import { ConnectedAccount } from '../models/index';
import { ResponseHandler } from '../utils/responseHandler';
import { ValidationError, AuthenticationError } from '../utils/errors';
import logger from '../utils/logger';

export class GoogleAuthController {
  /**
   * GET /auth/google
   * Start Google OAuth flow by redirecting user to Google consent screen
   */
  static redirectToGoogle(req: Request, res: Response, next: NextFunction): void {
    try {
      const token = req.query.token as string;
      if (!token) {
        throw new ValidationError('Authentication token must be provided in the token query parameter');
      }

      // Verify the token to make sure user is valid
      const decoded = AuthService.verifyAccessToken(token);
      
      // Use the JWT token itself as the state parameter to verify identity on callback
      const authUrl = GmailService.getAuthUrl(token);

      res.redirect(authUrl);
    } catch (error) {
      logger.error('Error redirecting to Google OAuth:', error);
      next(error);
    }
  }

  /**
   * GET /auth/google/callback
   * Handle redirect from Google OAuth consent screen
   */
  static async handleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    const code = req.query.code as string;
    const state = req.query.state as string; // state contains the JWT token

    try {
      if (!code || !state) {
        throw new ValidationError('Missing authorization code or state from Google redirect');
      }

      // Verify token inside the state parameter
      const decoded = AuthService.verifyAccessToken(state);
      const userId = decoded.userId;

      // Exchange code for tokens and save account
      await GmailService.connectAccount(userId, code);

      // Redirect user back to frontend settings page with success flag
      res.redirect('http://localhost:5173/settings?success=true');
    } catch (error: any) {
      logger.error('Error handling Google OAuth callback:', error);
      // Redirect user back to settings page with error query parameter
      res.redirect(`http://localhost:5173/settings?error=${encodeURIComponent(error.message || 'Failed to connect Gmail account')}`);
    }
  }

  /**
   * GET /auth/google/status
   * Get connection status and connected email address
   */
  static async getConnectionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AuthenticationError('User not authenticated');
      }

      const account = await ConnectedAccount.findOne({ userId, provider: 'google' });

      if (account) {
        ResponseHandler.success(res, 200, 'Connected account found', {
          connected: true,
          email: account.email,
          createdAt: account.createdAt,
        });
      } else {
        ResponseHandler.success(res, 200, 'No connected account found', {
          connected: false,
        });
      }
    } catch (error) {
      logger.error('Error checking Google connection status:', error);
      next(error);
    }
  }

  /**
   * POST /auth/google/disconnect
   * Disconnect Google account and delete connection details
   */
  static async disconnectAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AuthenticationError('User not authenticated');
      }

      const { email } = req.body;
      if (!email) {
        throw new ValidationError('Connected email must be provided to disconnect');
      }

      await GmailService.disconnectAccount(userId, email);

      ResponseHandler.success(res, 200, 'Gmail account disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting Gmail account:', error);
      next(error);
    }
  }

  /**
   * GET /auth/google/scopes
   * Return the active OAuth scopes for the connected Gmail account
   */
  static async getTokenScopes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AuthenticationError('User not authenticated');
      }

      const account = await ConnectedAccount.findOne({ userId, provider: 'google' });

      if (!account) {
        ResponseHandler.success(res, 200, 'No Gmail account connected', {
          connected: false,
          scopes: [],
        });
        return;
      }

      try {
        const scopes = await GmailService.verifyGmailSendScope(account);
        ResponseHandler.success(res, 200, 'Token scope verification successful', {
          connected: true,
          email: account.email,
          scopes,
          hasGmailSend: scopes.includes('https://www.googleapis.com/auth/gmail.send'),
        });
      } catch (scopeError: any) {
        ResponseHandler.success(res, 200, 'Token scope check completed', {
          connected: true,
          email: account.email,
          scopes: [],
          hasGmailSend: false,
          error: scopeError.message,
          action: 'Please disconnect and reconnect your Gmail account to grant the required send permission.',
        });
      }
    } catch (error) {
      logger.error('Error checking token scopes:', error);
      next(error);
    }
  }
}
