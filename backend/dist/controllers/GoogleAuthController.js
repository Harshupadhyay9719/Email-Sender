"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleAuthController = void 0;
const AuthService_1 = __importDefault(require("../services/auth/AuthService"));
const GmailService_1 = __importDefault(require("../services/email/GmailService"));
const index_1 = require("../models/index");
const responseHandler_1 = require("../utils/responseHandler");
const errors_1 = require("../utils/errors");
const encryption_1 = require("../utils/encryption");
const logger_1 = __importDefault(require("../utils/logger"));
class GoogleAuthController {
    /**
     * GET /auth/google
     * Start Google OAuth flow by redirecting user to Google consent screen
     */
    static redirectToGoogle(req, res, next) {
        try {
            const token = req.query.token;
            if (!token) {
                throw new errors_1.ValidationError('Authentication token must be provided in the token query parameter');
            }
            // Verify the token to make sure user is valid
            const decoded = AuthService_1.default.verifyAccessToken(token);
            // Use the JWT token itself as the state parameter to verify identity on callback
            const authUrl = GmailService_1.default.getAuthUrl(token);
            res.redirect(authUrl);
        }
        catch (error) {
            logger_1.default.error('Error redirecting to Google OAuth:', error);
            next(error);
        }
    }
    /**
     * POST /auth/google/initiate
     * Initiate Google OAuth flow by saving custom client ID/secret and generating Auth URL
     */
    static async initiateGoogleAuth(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const { clientId, clientSecret } = req.body;
            if (!clientId || !clientSecret) {
                throw new errors_1.ValidationError('Google Client ID and Client Secret are required');
            }
            // Find or create ConnectedAccount
            let account = await index_1.ConnectedAccount.findOne({ userId, provider: 'google' });
            if (!account) {
                account = new index_1.ConnectedAccount({
                    userId,
                    provider: 'google',
                });
            }
            // Encrypt and store keys
            account.clientId = (0, encryption_1.encrypt)(clientId);
            account.clientSecret = (0, encryption_1.encrypt)(clientSecret);
            await account.save();
            // Extract raw JWT token from Authorization header to pass as state parameter
            const authHeader = req.headers.authorization;
            const token = authHeader && authHeader.split(' ')[1];
            if (!token) {
                throw new errors_1.AuthenticationError('Authorization token is missing');
            }
            // Generate the URL for the consent screen using custom credentials
            const authUrl = GmailService_1.default.getAuthUrl(token, clientId, clientSecret);
            responseHandler_1.ResponseHandler.success(res, 200, 'OAuth connection initiated successfully', { authUrl });
        }
        catch (error) {
            logger_1.default.error('Error initiating Google OAuth:', error);
            next(error);
        }
    }
    /**
     * GET /auth/google/callback
     * Handle redirect from Google OAuth consent screen
     */
    static async handleCallback(req, res, next) {
        const code = req.query.code;
        const state = req.query.state; // state contains the JWT token
        try {
            if (!code || !state) {
                throw new errors_1.ValidationError('Missing authorization code or state from Google redirect');
            }
            // Verify token inside the state parameter
            const decoded = AuthService_1.default.verifyAccessToken(state);
            const userId = decoded.userId;
            // Exchange code for tokens and save account
            await GmailService_1.default.connectAccount(userId, code);
            // Redirect user back to frontend settings page with success flag
            res.redirect('http://localhost:5173/settings?success=true');
        }
        catch (error) {
            logger_1.default.error('Error handling Google OAuth callback:', error);
            // Redirect user back to settings page with error query parameter
            res.redirect(`http://localhost:5173/settings?error=${encodeURIComponent(error.message || 'Failed to connect Gmail account')}`);
        }
    }
    /**
     * GET /auth/google/status
     * Get connection status and connected email address
     */
    static async getConnectionStatus(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const account = await index_1.ConnectedAccount.findOne({ userId, provider: 'google' });
            if (account && account.email && account.refreshToken) {
                responseHandler_1.ResponseHandler.success(res, 200, 'Connected account found', {
                    connected: true,
                    email: account.email,
                    createdAt: account.createdAt,
                });
            }
            else {
                responseHandler_1.ResponseHandler.success(res, 200, 'No connected account found', {
                    connected: false,
                });
            }
        }
        catch (error) {
            logger_1.default.error('Error checking Google connection status:', error);
            next(error);
        }
    }
    /**
     * POST /auth/google/disconnect
     * Disconnect Google account and delete connection details
     */
    static async disconnectAccount(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const { email } = req.body;
            if (!email) {
                throw new errors_1.ValidationError('Connected email must be provided to disconnect');
            }
            await GmailService_1.default.disconnectAccount(userId, email);
            responseHandler_1.ResponseHandler.success(res, 200, 'Gmail account disconnected successfully');
        }
        catch (error) {
            logger_1.default.error('Error disconnecting Gmail account:', error);
            next(error);
        }
    }
    /**
     * GET /auth/google/scopes
     * Return the active OAuth scopes for the connected Gmail account
     */
    static async getTokenScopes(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new errors_1.AuthenticationError('User not authenticated');
            }
            const account = await index_1.ConnectedAccount.findOne({ userId, provider: 'google' });
            if (!account) {
                responseHandler_1.ResponseHandler.success(res, 200, 'No Gmail account connected', {
                    connected: false,
                    scopes: [],
                });
                return;
            }
            try {
                const scopes = await GmailService_1.default.verifyGmailSendScope(account);
                responseHandler_1.ResponseHandler.success(res, 200, 'Token scope verification successful', {
                    connected: true,
                    email: account.email,
                    scopes,
                    hasGmailSend: scopes.includes('https://www.googleapis.com/auth/gmail.send'),
                });
            }
            catch (scopeError) {
                responseHandler_1.ResponseHandler.success(res, 200, 'Token scope check completed', {
                    connected: true,
                    email: account.email,
                    scopes: [],
                    hasGmailSend: false,
                    error: scopeError.message,
                    action: 'Please disconnect and reconnect your Gmail account to grant the required send permission.',
                });
            }
        }
        catch (error) {
            logger_1.default.error('Error checking token scopes:', error);
            next(error);
        }
    }
}
exports.GoogleAuthController = GoogleAuthController;
//# sourceMappingURL=GoogleAuthController.js.map