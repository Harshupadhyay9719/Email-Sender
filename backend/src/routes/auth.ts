/**
 * Authentication Routes
 */

import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { GoogleAuthController } from '../controllers/GoogleAuthController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);

// Google OAuth Redirect and Callback
router.get('/google', GoogleAuthController.redirectToGoogle);
router.get('/google/callback', GoogleAuthController.handleCallback);

// Protected routes
router.post('/logout', authenticate, AuthController.logout);
router.post('/verify', authenticate, AuthController.verify);

// Protected Google OAuth Status & Disconnect & Scopes
router.get('/google/status', authenticate, GoogleAuthController.getConnectionStatus);
router.post('/google/disconnect', authenticate, GoogleAuthController.disconnectAccount);
router.get('/google/scopes', authenticate, GoogleAuthController.getTokenScopes);

export default router;
